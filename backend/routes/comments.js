const router = require('express').Router();
const { getDb } = require('../database');
const { auth, optionalAuth } = require('../middleware/auth');

router.get('/:productId', optionalAuth, (req, res) => {
  const db = getDb();
  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.product_id = ? AND c.parent_id IS NULL
    ORDER BY c.created_at DESC
  `).all(req.params.productId);

  for (const c of comments) {
    c.replies = db.prepare(`
      SELECT c2.*, u.username, u.avatar
      FROM comments c2 JOIN users u ON u.id = c2.user_id
      WHERE c2.parent_id = ?
      ORDER BY c2.created_at ASC
    `).all(c.id);
  }
  res.json(comments);
});

router.post('/:productId', auth, (req, res) => {
  const { content, parent_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Contenido requerido' });
  const db = getDb();
  const p = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.productId);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  const info = db.prepare('INSERT INTO comments (product_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)').run(req.params.productId, req.user.id, content.trim(), parent_id || null);
  const comment = db.prepare('SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?').get(info.lastInsertRowid);
  res.json(comment);
});

router.delete('/:id', auth, (req, res) => {
  const db = getDb();
  const c = db.prepare('SELECT * FROM comments WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!c) return res.status(404).json({ error: 'Comentario no encontrado' });
  db.prepare('DELETE FROM comments WHERE id = ? OR parent_id = ?').run(req.params.id, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
