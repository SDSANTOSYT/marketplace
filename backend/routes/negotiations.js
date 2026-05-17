const router = require('express').Router();
const { getDb } = require('../database');
const { auth } = require('../middleware/auth');
const { createNotification } = require('./notifications');

router.get('/', auth, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT n.*, p.title as product_title, p.images as product_images, p.price as original_price,
           b.username as buyer_username, s.username as seller_username
    FROM negotiations n
    JOIN products p ON p.id = n.product_id
    JOIN users b ON b.id = n.buyer_id
    JOIN users s ON s.id = n.seller_id
    WHERE n.buyer_id = ? OR n.seller_id = ?
    ORDER BY n.created_at DESC
  `).all(req.user.id, req.user.id);
  res.json(rows.map(r => ({ ...r, product_images: JSON.parse(r.product_images || '[]') })));
});

router.get('/:id', auth, (req, res) => {
  const db = getDb();
  const n = db.prepare(`
    SELECT n.*, p.title as product_title, p.images as product_images, p.price as original_price, p.condition,
           b.username as buyer_username, s.username as seller_username
    FROM negotiations n
    JOIN products p ON p.id = n.product_id
    JOIN users b ON b.id = n.buyer_id
    JOIN users s ON s.id = n.seller_id
    WHERE n.id = ? AND (n.buyer_id = ? OR n.seller_id = ?)
  `).get(req.params.id, req.user.id, req.user.id);
  if (!n) return res.status(404).json({ error: 'Negociación no encontrada' });
  n.product_images = JSON.parse(n.product_images || '[]');
  n.messages = db.prepare(`
    SELECT nm.*, u.username FROM negotiation_messages nm
    JOIN users u ON u.id = nm.sender_id
    WHERE nm.negotiation_id = ? ORDER BY nm.created_at ASC
  `).all(req.params.id);
  res.json(n);
});

router.post('/', auth, (req, res) => {
  const { product_id, initial_message } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id requerido' });
  const db = getDb();
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  if (p.condition !== 'used') return res.status(400).json({ error: 'Solo se puede negociar productos usados' });
  if (p.seller_id === req.user.id) return res.status(400).json({ error: 'No puedes negociar tus propios productos' });

  const existing = db.prepare('SELECT * FROM negotiations WHERE buyer_id = ? AND product_id = ? AND status = ?').get(req.user.id, product_id, 'open');
  if (existing) return res.json({ id: existing.id, existing: true });

  const info = db.prepare('INSERT INTO negotiations (buyer_id, seller_id, product_id) VALUES (?, ?, ?)').run(req.user.id, p.seller_id, product_id);
  const negId = info.lastInsertRowid;
  if (initial_message) {
    db.prepare('INSERT INTO negotiation_messages (negotiation_id, sender_id, message) VALUES (?, ?, ?)').run(negId, req.user.id, initial_message);
  }
  res.json({ id: negId });
});

router.post('/:id/messages', auth, (req, res) => {
  const { message, proposed_price } = req.body;
  if (!message && !proposed_price) return res.status(400).json({ error: 'Mensaje o precio propuesto requerido' });
  const db = getDb();
  const n = db.prepare('SELECT * FROM negotiations WHERE id = ? AND (buyer_id = ? OR seller_id = ?) AND status = ?').get(req.params.id, req.user.id, req.user.id, 'open');
  if (!n) return res.status(404).json({ error: 'Negociación no encontrada o cerrada' });

  // Guardar el mensaje con la propuesta de precio (si existe)
  const info = db.prepare('INSERT INTO negotiation_messages (negotiation_id, sender_id, message, proposed_price) VALUES (?, ?, ?, ?)').run(req.params.id, req.user.id, message || null, proposed_price || null);
  const msg = db.prepare('SELECT nm.*, u.username FROM negotiation_messages nm JOIN users u ON u.id = nm.sender_id WHERE nm.id = ?').get(info.lastInsertRowid);

  // Si se propone un precio, actualizar el precio propuesto de este usuario
  if (proposed_price) {
    const isBuyer = req.user.id === n.buyer_id;
    db.prepare(`UPDATE negotiations SET ${isBuyer ? 'buyer_proposed_price' : 'seller_proposed_price'} = ? WHERE id = ?`)
      .run(proposed_price, req.params.id);
    
    // Emitir actualización de propuestas
    const updatedNeg = db.prepare('SELECT buyer_proposed_price, seller_proposed_price FROM negotiations WHERE id = ?').get(req.params.id);
    req.io?.to(`neg-${req.params.id}`).emit('prices-updated', updatedNeg);
  }
  
  req.io?.to(`neg-${req.params.id}`).emit('message', msg);

  // Notificar al otro participante
  const recipientId = req.user.id === n.buyer_id ? n.seller_id : n.buyer_id;
  const senderRow = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);
  const notifBody = proposed_price
    ? `@${senderRow?.username} propuso $${Number(proposed_price).toLocaleString()}`
    : `@${senderRow?.username} te envió un mensaje`;
  createNotification(db, req.io, {
    userId: recipientId,
    type: 'new_message',
    title: 'Nuevo mensaje en negociación',
    body: notifBody,
    relatedId: n.id,
  });

  res.json(msg);
});

router.post('/:id/agree', auth, (req, res) => {
  const { price } = req.body;
  if (!price || price <= 0) return res.status(400).json({ error: 'Precio válido requerido' });
  const db = getDb();
  const n = db.prepare('SELECT * FROM negotiations WHERE id = ? AND (buyer_id = ? OR seller_id = ?) AND status = ?').get(req.params.id, req.user.id, req.user.id, 'open');
  if (!n) return res.status(404).json({ error: 'Negociación no encontrada' });

  const isBuyer = req.user.id === n.buyer_id;
  const otherProposedPrice = isBuyer ? n.seller_proposed_price : n.buyer_proposed_price;
  
  // Chequear si estamos aceptando el precio que el otro propuso
  // Si es así, la negociación se completa automáticamente
  if (otherProposedPrice && Number(otherProposedPrice) === Number(price)) {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE negotiations SET status = ?, agreed_price = ?, expires_at = ? WHERE id = ?')
      .run('agreed', price, expires, req.params.id);

    // Agregar al carrito del comprador
    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(n.buyer_id, n.product_id);
    if (existing) {
      db.prepare('UPDATE cart_items SET negotiated_price = ?, negotiation_expires_at = ? WHERE id = ?').run(price, expires, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity, negotiated_price, negotiation_expires_at) VALUES (?, ?, 1, ?, ?)').run(n.buyer_id, n.product_id, price, expires);
    }

    req.io?.to(`neg-${req.params.id}`).emit('agreed', { price, expires_at: expires });
    res.json({ ok: true, status: 'agreed', expires_at: expires });
  } else {
    // El precio que está aceptando no es el que el otro propuso
    // Esto no debería pasar en el flujo normal, pero lo manejamos como error
    res.status(400).json({ error: 'El precio no coincide con la propuesta actual. Recarga la página.' });
  }
});

router.post('/:id/reject', auth, (req, res) => {
  const db = getDb();
  const n = db.prepare('SELECT * FROM negotiations WHERE id = ? AND (buyer_id = ? OR seller_id = ?) AND status = ?').get(req.params.id, req.user.id, req.user.id, 'open');
  if (!n) return res.status(404).json({ error: 'Negociación no encontrada' });
  db.prepare('UPDATE negotiations SET status = ? WHERE id = ?').run('rejected', req.params.id);
  req.io?.to(`neg-${req.params.id}`).emit('rejected');
  res.json({ ok: true });
});

module.exports = router;
