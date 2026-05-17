const router = require('express').Router();
const { getDb } = require('../database');
const { auth } = require('../middleware/auth');

function getCart(userId, db) {
  const items = db.prepare(`
    SELECT ci.*, p.title, p.price, p.images, p.condition, p.quantity as stock, p.seller_id
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ?
  `).all(userId);
  return items.map(i => ({
    ...i,
    images: JSON.parse(i.images || '[]'),
    effectivePrice: (i.negotiated_price && new Date(i.negotiation_expires_at) > new Date()) ? i.negotiated_price : i.price
  }));
}

router.get('/', auth, (req, res) => {
  res.json(getCart(req.user.id, getDb()));
});

router.post('/', auth, (req, res) => {
  const { product_id, quantity = 1, size, color } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id requerido' });
  const db = getDb();
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  if (p.seller_id === req.user.id) return res.status(400).json({ error: 'No puedes comprar tus propios productos' });
  const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND (size IS ? OR size = ?) AND (color IS ? OR color = ?)').get(req.user.id, product_id, size || null, size || null, color || null, color || null);
  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
    return res.json({ id: existing.id });
  }
  const info = db.prepare('INSERT INTO cart_items (user_id, product_id, quantity, size, color) VALUES (?, ?, ?, ?, ?)').run(req.user.id, product_id, quantity, size || null, color || null);
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', auth, (req, res) => {
  const { quantity } = req.body;
  const db = getDb();
  const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Item no encontrado' });
  if (quantity <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
  }
  res.json({ ok: true });
});

router.delete('/:id', auth, (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Item no encontrado' });
  db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.delete('/', auth, (req, res) => {
  getDb().prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
