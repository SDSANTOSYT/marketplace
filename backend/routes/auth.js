const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { auth } = require('../middleware/auth');

const SECRET = () => process.env.JWT_SECRET || 'dev_secret';
const sign = (user) => jwt.sign({ id: user.id, username: user.username, email: user.email }, SECRET(), { expiresIn: '7d' });

router.post('/register', (req, res) => {
  const { username, email, password, phone, name, address } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Campos requeridos: username, email, password' });
  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    const info = stmt.run(username.trim(), email.trim().toLowerCase(), hash);
    const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(info.lastInsertRowid);
    if (name || phone) {
      // optional profile data
    }
    if (address && name && phone) {
      db.prepare('INSERT INTO addresses (user_id, name, phone, address) VALUES (?, ?, ?, ?)').run(user.id, name, phone, address);
    }
    res.json({ token: sign(user), user });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'El usuario o correo ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', (req, res) => {
   const { email, password } = req.body;
   if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
   const db = getDb();
   const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
   if (!user || !bcrypt.compareSync(password, user.password_hash))
     return res.status(400).json({ error: 'Credenciales incorrectas' });
   const { password_hash, ...safe } = user;
   res.json({ token: sign(user), user: safe });
});

router.get('/me', auth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, email, recovery_email, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

module.exports = router;
