const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { auth } = require('../middleware/auth');

// Get public profile
router.get('/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, avatar, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const avgRating = db.prepare('SELECT AVG(rating) as avg FROM reviews WHERE seller_id = ?').get(req.params.id);
  const totalSales = db.prepare('SELECT COUNT(*) as c FROM order_items WHERE seller_id = ?').get(req.params.id);
  res.json({ ...user, avgRating: avgRating?.avg || 0, totalSales: totalSales?.c || 0 });
});

// Update own profile
router.put('/me/profile', auth, (req, res) => {
  const { username, email, recovery_email, password } = req.body;
  const db = getDb();
  const updates = [];
  const vals = [];
  if (username) { updates.push('username = ?'); vals.push(username.trim()); }
  if (email) { updates.push('email = ?'); vals.push(email.trim().toLowerCase()); }
  if (recovery_email !== undefined) { updates.push('recovery_email = ?'); vals.push(recovery_email || null); }
  if (password) { updates.push('password_hash = ?'); vals.push(bcrypt.hashSync(password, 10)); }
  if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' });
  vals.push(req.user.id);
  try {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
    res.json({ ok: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'El usuario o correo ya existe' });
    res.status(500).json({ error: e.message });
  }
});

// Addresses
router.get('/me/addresses', auth, (req, res) => {
  res.json(getDb().prepare('SELECT * FROM addresses WHERE user_id = ?').all(req.user.id));
});

router.post('/me/addresses', auth, (req, res) => {
  const { name, phone, address } = req.body;
  if (!name || !phone || !address) return res.status(400).json({ error: 'Campos requeridos' });
  const info = getDb().prepare('INSERT INTO addresses (user_id, name, phone, address) VALUES (?, ?, ?, ?)').run(req.user.id, name, phone, address);
  res.json({ id: info.lastInsertRowid, user_id: req.user.id, name, phone, address });
});

router.put('/me/addresses/:id', auth, (req, res) => {
  const { name, phone, address } = req.body;
  const db = getDb();
  const row = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Dirección no encontrada' });
  db.prepare('UPDATE addresses SET name=?, phone=?, address=? WHERE id=?').run(name || row.name, phone || row.phone, address || row.address, req.params.id);
  res.json({ ok: true });
});

router.delete('/me/addresses/:id', auth, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Dirección no encontrada' });
  db.prepare('DELETE FROM addresses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Payment methods
router.get('/me/payments', auth, (req, res) => {
  res.json(getDb().prepare('SELECT * FROM payment_methods WHERE user_id = ?').all(req.user.id));
});

router.post('/me/payments', auth, (req, res) => {
  const { type, label, data } = req.body;
  if (!type || !label) return res.status(400).json({ error: 'Tipo y etiqueta requeridos' });
  const info = getDb().prepare('INSERT INTO payment_methods (user_id, type, label, data) VALUES (?, ?, ?, ?)').run(req.user.id, type, label, JSON.stringify(data || {}));
  res.json({ id: info.lastInsertRowid, user_id: req.user.id, type, label });
});

router.put('/me/payments/:id', auth, (req, res) => {
  const { label, data } = req.body;
  const db = getDb();
  const row = db.prepare('SELECT * FROM payment_methods WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('UPDATE payment_methods SET label=?, data=? WHERE id=?').run(label || row.label, data ? JSON.stringify(data) : row.data, req.params.id);
  res.json({ ok: true });
});

router.delete('/me/payments/:id', auth, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM payment_methods WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM payment_methods WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
