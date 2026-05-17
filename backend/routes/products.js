const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const { getDb } = require('../database');
const { auth, optionalAuth } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function enrichProduct(p, db) {
  p.images = JSON.parse(p.images || '[]');
  p.sizes = JSON.parse(p.sizes || '[]');
  p.colors = JSON.parse(p.colors || '[]');
  const seller = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(p.seller_id);
  const rating = db.prepare('SELECT AVG(r.rating) as avg FROM reviews r JOIN order_items oi ON oi.id = r.order_item_id WHERE oi.seller_id = ?').get(p.seller_id);
  p.seller = seller;
  p.sellerRating = rating?.avg || 0;
  return p;
}

// List / search
router.get('/', optionalAuth, (req, res) => {
  const { q, category, condition, minPrice, maxPrice, page = 1, limit = 20, seller } = req.query;
  const db = getDb();
  let sql = 'SELECT p.* FROM products p WHERE 1=1';
  const params = [];
  if (q) { sql += ' AND (p.title LIKE ? OR p.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (category) { sql += ' AND p.category = ?'; params.push(category); }
  if (condition) { sql += ' AND p.condition = ?'; params.push(condition); }
  if (minPrice) { sql += ' AND p.price >= ?'; params.push(Number(minPrice)); }
  if (maxPrice) { sql += ' AND p.price <= ?'; params.push(Number(maxPrice)); }
  if (seller) { sql += ' AND p.seller_id = ?'; params.push(Number(seller)); }
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));
  const products = db.prepare(sql).all(...params).map(p => enrichProduct(p, db));
  const total = db.prepare('SELECT COUNT(*) as c FROM products p WHERE 1=1' + (q ? ' AND (p.title LIKE ? OR p.description LIKE ?)' : '') + (category ? ' AND p.category = ?' : '') + (condition ? ' AND p.condition = ?' : '') + (seller ? ' AND p.seller_id = ?' : '')).get(...params.slice(0, -2)).c;
  res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// Recommended
router.get('/recommended', optionalAuth, (req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT * FROM products ORDER BY views DESC, created_at DESC LIMIT 20').all().map(p => enrichProduct(p, db));
  res.json(products);
});

// Get single
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
  db.prepare('UPDATE products SET views = views + 1 WHERE id = ?').run(req.params.id);
  res.json(enrichProduct(p, db));
});

// Create
router.post('/', auth, upload.array('images', 10), (req, res) => {
  const { title, description, price, quantity, category, condition, sizes, colors } = req.body;
  if (!title || !price || !category || !condition) return res.status(400).json({ error: 'Campos requeridos' });
  const images = (req.files || []).map(f => `uploads/${f.filename}`);
  if (!images.length) return res.status(400).json({ error: 'Se requiere al menos una imagen' });
  const db = getDb();
  const info = db.prepare(
    'INSERT INTO products (seller_id, title, description, price, quantity, category, condition, sizes, colors, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, title, description || '', Number(price), Number(quantity) || 1, category, condition, sizes || '[]', colors || '[]', JSON.stringify(images));
  res.json({ id: info.lastInsertRowid });
});

// Update
router.put('/:id', auth, upload.array('images', 10), (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT * FROM products WHERE id = ? AND seller_id = ?').get(req.params.id, req.user.id);
  if (!p) return res.status(404).json({ error: 'No encontrado o sin permiso' });
  const { title, description, price, quantity, category, condition, sizes, colors } = req.body;
  const newImages = (req.files || []).map(f => `uploads/${f.filename}`);
  const images = newImages.length ? JSON.stringify(newImages) : p.images;
  db.prepare('UPDATE products SET title=?, description=?, price=?, quantity=?, category=?, condition=?, sizes=?, colors=?, images=? WHERE id=?').run(
    title || p.title, description ?? p.description, price ? Number(price) : p.price,
    quantity ? Number(quantity) : p.quantity, category || p.category, condition || p.condition,
    sizes || p.sizes, colors || p.colors, images, req.params.id
  );
  res.json({ ok: true });
});

// Delete
router.delete('/:id', auth, (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT * FROM products WHERE id = ? AND seller_id = ?').get(req.params.id, req.user.id);
  if (!p) return res.status(404).json({ error: 'No encontrado o sin permiso' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
