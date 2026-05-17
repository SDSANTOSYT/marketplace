const router = require('express').Router();
const { getDb } = require('../database');
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const db = getDb();
  const outfits = db.prepare('SELECT * FROM outfits WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  for (const o of outfits) {
    const items = db.prepare(`
      SELECT p.*, u.username as seller_username
      FROM outfit_items oi JOIN products p ON p.id = oi.product_id
      JOIN users u ON u.id = p.seller_id
      WHERE oi.outfit_id = ?
    `).all(o.id);
    o.items = items.map(p => ({ ...p, images: JSON.parse(p.images || '[]') }));
  }
  res.json(outfits);
});

router.post('/', auth, (req, res) => {
  const { name, product_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const db = getDb();
  const info = db.prepare('INSERT INTO outfits (user_id, name) VALUES (?, ?)').run(req.user.id, name);
  if (product_id) {
    db.prepare('INSERT INTO outfit_items (outfit_id, product_id) VALUES (?, ?)').run(info.lastInsertRowid, product_id);
  }
  res.json({ id: info.lastInsertRowid });
});

router.put('/:id', auth, (req, res) => {
  const { name } = req.body;
  const db = getDb();
  const o = db.prepare('SELECT * FROM outfits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!o) return res.status(404).json({ error: 'Outfit no encontrado' });
  db.prepare('UPDATE outfits SET name = ? WHERE id = ?').run(name || o.name, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', auth, (req, res) => {
  const db = getDb();
  const o = db.prepare('SELECT * FROM outfits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!o) return res.status(404).json({ error: 'Outfit no encontrado' });
  db.prepare('DELETE FROM outfits WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/items', auth, (req, res) => {
  const { product_id } = req.body;
  const db = getDb();
  const o = db.prepare('SELECT * FROM outfits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!o) return res.status(404).json({ error: 'Outfit no encontrado' });
  try {
    db.prepare('INSERT INTO outfit_items (outfit_id, product_id) VALUES (?, ?)').run(req.params.id, product_id);
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: 'Ya está en el outfit' });
  }
});

router.delete('/:id/items/:productId', auth, (req, res) => {
  const db = getDb();
  const o = db.prepare('SELECT * FROM outfits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!o) return res.status(404).json({ error: 'Outfit no encontrado' });
  db.prepare('DELETE FROM outfit_items WHERE outfit_id = ? AND product_id = ?').run(req.params.id, req.params.productId);
  res.json({ ok: true });
});

module.exports = router;
