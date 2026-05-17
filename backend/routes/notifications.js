const router = require('express').Router();
const { getDb } = require('../database');
const { auth } = require('../middleware/auth');

/**
 * Crea una notificación en base de datos y la emite en tiempo real al usuario.
 * Se exporta para ser reutilizada en otros routers.
 */
function createNotification(db, io, { userId, type, title, body, relatedId = null }) {
  try {
    const info = db.prepare(
      'INSERT INTO notifications (user_id, type, title, body, related_id) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, type, title, body, relatedId ?? null);
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(info.lastInsertRowid);
    io?.to(`user-${userId}`).emit('notification', notif);
    return notif;
  } catch (e) {
    console.error('Error creando notificación:', e);
  }
}

// GET /api/notifications — lista las últimas 50 notificaciones del usuario
router.get('/', auth, (req, res) => {
  const db = getDb();
  const notifs = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.id);
  res.json(notifs);
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
  res.json({ count: row.count });
});

// PUT /api/notifications/read-all — marca todas como leídas
router.put('/read-all', auth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// PUT /api/notifications/:id/read — marca una notificación como leída
router.put('/:id/read', auth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// DELETE /api/notifications/:id — elimina una notificación
router.delete('/:id', auth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = { router, createNotification };
