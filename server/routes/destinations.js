const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SORTS = {
  popular: 'rating DESC, name ASC',
  price_asc: 'price_per_day ASC',
  price_desc: 'price_per_day DESC',
  name: 'name ASC',
};

function validate(body, partial = false) {
  const errors = {};
  const need = (k, msg) => {
    if (!partial || body[k] !== undefined) {
      if (body[k] === undefined || body[k] === null || String(body[k]).trim() === '') errors[k] = msg;
    }
  };
  need('name', 'Name is required.');
  need('country', 'Country is required.');
  need('category', 'Category is required.');
  need('description', 'Description is required.');
  need('image', 'Image URL is required.');
  if (!partial || body.price_per_day !== undefined) {
    const p = Number(body.price_per_day);
    if (Number.isNaN(p) || p < 0) errors.price_per_day = 'Price per day must be a non-negative number.';
  }
  if (body.rating !== undefined) {
    const r = Number(body.rating);
    if (Number.isNaN(r) || r < 0 || r > 5) errors.rating = 'Rating must be between 0 and 5.';
  }
  return errors;
}

// GET /api/destinations?search=&category=&country=&minPrice=&maxPrice=&sort=
router.get('/', (req, res) => {
  const { search, category, country, minPrice, maxPrice, sort } = req.query;
  const where = [];
  const params = [];
  if (search) {
    where.push('(name LIKE ? OR country LIKE ? OR description LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  if (category && category !== 'all') { where.push('category = ?'); params.push(category); }
  if (country && country !== 'all') { where.push('country = ?'); params.push(country); }
  if (minPrice !== undefined && minPrice !== '' && !Number.isNaN(Number(minPrice))) { where.push('price_per_day >= ?'); params.push(Number(minPrice)); }
  if (maxPrice !== undefined && maxPrice !== '' && !Number.isNaN(Number(maxPrice))) { where.push('price_per_day <= ?'); params.push(Number(maxPrice)); }
  const orderBy = SORTS[sort] || SORTS.popular;
  const sql = `SELECT * FROM destinations ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${orderBy}`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/meta/filters', (req, res) => {
  res.json({
    categories: db.prepare('SELECT DISTINCT category FROM destinations ORDER BY category').all().map(r => r.category),
    countries: db.prepare('SELECT DISTINCT country FROM destinations ORDER BY country').all().map(r => r.country),
    maxPrice: db.prepare('SELECT COALESCE(MAX(price_per_day),0) m FROM destinations').get().m,
  });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM destinations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Destination not found.' });
  res.json(row);
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const errors = validate(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', errors });
  const b = req.body;
  const info = db.prepare(`INSERT INTO destinations (name, country, category, description, image, price_per_day, rating, best_season, highlights)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    b.name.trim(), b.country.trim(), b.category.trim(), b.description.trim(), b.image.trim(),
    Number(b.price_per_day), b.rating !== undefined ? Number(b.rating) : 4.0, b.best_season || null, b.highlights || null);
  res.status(201).json(db.prepare('SELECT * FROM destinations WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM destinations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Destination not found.' });
  const errors = validate(req.body || {}, true);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', errors });
  const m = { ...existing, ...req.body };
  db.prepare(`UPDATE destinations SET name=?, country=?, category=?, description=?, image=?, price_per_day=?, rating=?, best_season=?, highlights=? WHERE id=?`)
    .run(m.name, m.country, m.category, m.description, m.image, Number(m.price_per_day), Number(m.rating), m.best_season, m.highlights, req.params.id);
  res.json(db.prepare('SELECT * FROM destinations WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM destinations WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Destination not found.' });
  res.status(204).end();
});

module.exports = router;
