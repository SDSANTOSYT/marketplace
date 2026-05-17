const router = require('express').Router();
const { getDb } = require('../database');
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const db = getDb();
  const items = db.prepare(`
    SELECT p.*, u.username as seller_username
    FROM wishlist_items wi
    JOIN products p ON p.id = wi.product_id
    JOIN users u ON u.id = p.seller_id
    WHERE wi.user_id = ?
  `).all(req.user.id);
  res.json(items.map(p => ({ ...p, images: JSON.parse(p.images || '[]'), sizes: JSON.parse(p.sizes || '[]'), colors: JSON.parse(p.colors || '[]') })));
});

router.post('/', auth, (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id requerido' });
  try {
    getDb().prepare('INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: 'Ya está en tu lista de deseos' });
  }
});

router.delete('/:productId', auth, (req, res) => {
  getDb().prepare('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  res.json({ ok: true });
});

router.get('/check/:productId', auth, (req, res) => {
  const item = getDb().prepare('SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?').get(req.user.id, req.params.productId);
  res.json({ inWishlist: !!item });
});

module.exports = router;
