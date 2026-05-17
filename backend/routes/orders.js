const router = require('express').Router();
const { getDb } = require('../database');
const { auth } = require('../middleware/auth');
const { createNotification } = require('./notifications');

router.get('/', auth, (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC').all(req.user.id);
  for (const o of orders) {
    o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  }
  res.json(orders);
});

router.get('/selling', auth, (req, res) => {
  const db = getDb();
  const items = db.prepare(`
    SELECT oi.*, o.created_at as order_date, u.username as buyer_username, u.email as buyer_email
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN users u ON u.id = o.buyer_id
    WHERE oi.seller_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id);
  res.json(items);
});

router.get('/:id', auth, (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json(order);
});

router.post('/', auth, (req, res) => {
  const { address_id, payment_id } = req.body;
  const db = getDb();

  const address = address_id ? db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(address_id, req.user.id) : null;
  if (!address) return res.status(400).json({ error: 'Dirección de envío requerida' });

  const payment = payment_id ? db.prepare('SELECT * FROM payment_methods WHERE id = ? AND user_id = ?').get(payment_id, req.user.id) : null;
  if (!payment) return res.status(400).json({ error: 'Método de pago requerido' });

  const cartItems = db.prepare(`
    SELECT ci.*, p.price, p.title, p.seller_id, p.images, p.quantity as stock
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ?
  `).all(req.user.id);

  if (!cartItems.length) return res.status(400).json({ error: 'El carrito está vacío' });

  // Validar stock antes de procesar
  for (const item of cartItems) {
    if (item.quantity > item.stock) {
      return res.status(400).json({ error: `"${item.title}" solo tiene ${item.stock} unidad${item.stock === 1 ? '' : 'es'} disponible${item.stock === 1 ? '' : 's'}` });
    }
  }

  const total = cartItems.reduce((sum, i) => {
    const price = (i.negotiated_price && new Date(i.negotiation_expires_at) > new Date()) ? i.negotiated_price : i.price;
    return sum + price * i.quantity;
  }, 0);

  const addressSnap = JSON.stringify({ name: address.name, phone: address.phone, address: address.address });

  const createOrder = db.transaction(() => {
    const orderInfo = db.prepare(
      'INSERT INTO orders (buyer_id, address_snapshot, payment_label, total) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, addressSnap, payment.label, total);
    const orderId = orderInfo.lastInsertRowid;

    for (const item of cartItems) {
      const price = (item.negotiated_price && new Date(item.negotiation_expires_at) > new Date()) ? item.negotiated_price : item.price;
      const images = JSON.parse(item.images || '[]');
      db.prepare(
        'INSERT INTO order_items (order_id, product_id, seller_id, title, image, quantity, price, size, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(orderId, item.product_id, item.seller_id, item.title, images[0] || null, item.quantity, price, item.size || null, item.color || null);

      // Reducir stock
      db.prepare('UPDATE products SET quantity = MAX(0, quantity - ?) WHERE id = ?').run(item.quantity, item.product_id);

      // Notificar al vendedor si el producto se queda sin stock
      const updatedProduct = db.prepare('SELECT quantity FROM products WHERE id = ?').get(item.product_id);
      if (updatedProduct && updatedProduct.quantity === 0) {
        createNotification(db, req.io, {
          userId: item.seller_id,
          type: 'out_of_stock',
          title: 'Producto sin stock',
          body: `"${item.title}" se agotó. Actualiza tu inventario para seguir vendiendo.`,
          relatedId: item.product_id,
        });
      }
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    return orderId;
  });

  const orderId = createOrder();

  // Notificar a cada vendedor sobre la nueva venta
  const sellerMap = {};
  for (const item of cartItems) {
    if (!sellerMap[item.seller_id]) sellerMap[item.seller_id] = [];
    sellerMap[item.seller_id].push(item.title);
  }
  for (const [sellerId, titles] of Object.entries(sellerMap)) {
    createNotification(db, req.io, {
      userId: Number(sellerId),
      type: 'new_sale',
      title: '¡Nueva venta!',
      body: titles.length === 1
        ? `Vendiste "${titles[0]}"`
        : `Vendiste ${titles.length} productos`,
      relatedId: orderId,
    });
  }

  res.json({ id: orderId });
});

// Vendedor agrega tracking
router.put('/items/:id/tracking', auth, (req, res) => {
  const { tracking_number, carrier } = req.body;
  if (!tracking_number || !carrier) return res.status(400).json({ error: 'Número de rastreo y empresa requeridos' });
  const db = getDb();
  const item = db.prepare('SELECT * FROM order_items WHERE id = ? AND seller_id = ?').get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Item no encontrado' });
  db.prepare('UPDATE order_items SET tracking_number = ?, carrier = ?, status = ? WHERE id = ?').run(tracking_number, carrier, 'shipped', req.params.id);

  // Notificar al comprador que su pedido fue enviado
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(item.order_id);
  if (order) {
    createNotification(db, req.io, {
      userId: order.buyer_id,
      type: 'order_shipped',
      title: 'Tu pedido fue enviado',
      body: `"${item.title}" está en camino. Rastreo: ${tracking_number} (${carrier})`,
      relatedId: item.order_id,
    });
  }

  res.json({ ok: true });
});

// Comprador marca como recibido
router.put('/items/:id/received', auth, (req, res) => {
  const db = getDb();
  const item = db.prepare(`
    SELECT oi.* FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = ? AND o.buyer_id = ?
  `).get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Item no encontrado' });
  db.prepare('UPDATE order_items SET status = ?, received_at = CURRENT_TIMESTAMP WHERE id = ?').run('received', req.params.id);
  res.json({ ok: true });
});

// Dejar reseña
router.post('/items/:id/review', auth, (req, res) => {
  const { rating, content } = req.body;
  if (rating === undefined || rating < 0 || rating > 5) return res.status(400).json({ error: 'Calificación entre 0 y 5' });
  const db = getDb();
  const item = db.prepare(`
    SELECT oi.* FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = ? AND o.buyer_id = ? AND oi.status = 'received'
  `).get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Solo puedes reseñar items recibidos' });
  try {
    db.prepare('INSERT INTO reviews (order_item_id, buyer_id, seller_id, rating, content) VALUES (?, ?, ?, ?, ?)').run(item.id, req.user.id, item.seller_id, rating, content || null);

    // Notificar al vendedor sobre la nueva reseña
    const reviewer = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    createNotification(db, req.io, {
      userId: item.seller_id,
      type: 'new_review',
      title: 'Nueva reseña recibida',
      body: `@${reviewer?.username} te calificó con ${stars} — "${item.title}"`,
      relatedId: item.id,
    });

    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: 'Ya dejaste una reseña para este item' });
  }
});

module.exports = router;
