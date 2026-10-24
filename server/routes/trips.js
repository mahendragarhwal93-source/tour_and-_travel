const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function loadTrip(tripId) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
  if (!trip) return null;
  trip.destinations = db.prepare(`
    SELECT td.id AS item_id, td.days, d.id, d.name, d.country, d.image, d.category, d.price_per_day,
           (td.days * d.price_per_day) AS subtotal
    FROM trip_destinations td JOIN destinations d ON d.id = td.destination_id
    WHERE td.trip_id = ? ORDER BY td.id`).all(tripId);
  trip.cost_per_person = trip.destinations.reduce((s, d) => s + d.subtotal, 0);
  trip.booking = db.prepare('SELECT * FROM bookings WHERE trip_id = ?').get(tripId) || null;
  return trip;
}

// Fetch trip and ensure it belongs to the logged in user (admins may view all)
function ownTrip(req, res) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) { res.status(404).json({ error: 'Trip not found.' }); return null; }
  if (trip.user_id !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'You do not have access to this trip.' }); return null;
  }
  return trip;
}

function validateTrip(b, partial = false) {
  const errors = {};
  if (!partial || b.title !== undefined) {
    if (!b.title || String(b.title).trim().length < 2) errors.title = 'Trip title must be at least 2 characters.';
  }
  if (!partial || b.start_date !== undefined) {
    if (!b.start_date || !DATE_RE.test(b.start_date) || Number.isNaN(Date.parse(b.start_date))) errors.start_date = 'Start date is required (YYYY-MM-DD).';
  }
  if (!partial || b.end_date !== undefined) {
    if (!b.end_date || !DATE_RE.test(b.end_date) || Number.isNaN(Date.parse(b.end_date))) errors.end_date = 'End date is required (YYYY-MM-DD).';
  }
  if (!errors.start_date && !errors.end_date && b.start_date && b.end_date && b.end_date < b.start_date) {
    errors.end_date = 'End date cannot be before start date.';
  }
  return errors;
}

router.get('/', (req, res) => {
  const rows = req.user.role === 'admin' && req.query.all === '1'
    ? db.prepare('SELECT id FROM trips ORDER BY created_at DESC, id DESC').all()
    : db.prepare('SELECT id FROM trips WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(req.user.id);
  res.json(rows.map(r => loadTrip(r.id)));
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const errors = validateTrip(b);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', errors });
  const info = db.prepare('INSERT INTO trips (user_id, title, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, b.title.trim(), b.start_date, b.end_date, b.notes || null);
  const tripId = info.lastInsertRowid;
  if (Array.isArray(b.destinations)) {
    const ins = db.prepare('INSERT OR IGNORE INTO trip_destinations (trip_id, destination_id, days) VALUES (?, ?, ?)');
    for (const item of b.destinations) {
      const destId = Number(item.destination_id ?? item.id);
      if (db.prepare('SELECT id FROM destinations WHERE id = ?').get(destId)) ins.run(tripId, destId, Math.max(1, Number(item.days) || 1));
    }
  }
  res.status(201).json(loadTrip(tripId));
});

router.get('/:id', (req, res) => {
  if (!ownTrip(req, res)) return;
  res.json(loadTrip(req.params.id));
});

router.put('/:id', (req, res) => {
  const trip = ownTrip(req, res); if (!trip) return;
  if (trip.status === 'booked') return res.status(409).json({ error: 'Booked trips cannot be edited. Cancel the booking first.' });
  const merged = { ...trip, ...req.body };
  const errors = validateTrip(merged);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', errors });
  db.prepare('UPDATE trips SET title=?, start_date=?, end_date=?, notes=? WHERE id=?')
    .run(merged.title.trim(), merged.start_date, merged.end_date, merged.notes || null, trip.id);
  res.json(loadTrip(trip.id));
});

router.delete('/:id', (req, res) => {
  const trip = ownTrip(req, res); if (!trip) return;
  db.prepare('DELETE FROM trips WHERE id = ?').run(trip.id);
  res.status(204).end();
});

// Add destination to trip
router.post('/:id/destinations', (req, res) => {
  const trip = ownTrip(req, res); if (!trip) return;
  if (trip.status === 'booked') return res.status(409).json({ error: 'Booked trips cannot be edited.' });
  const destId = Number(req.body?.destination_id);
  const days = Math.max(1, Number(req.body?.days) || 1);
  if (!destId || !db.prepare('SELECT id FROM destinations WHERE id = ?').get(destId)) {
    return res.status(404).json({ error: 'Destination not found.' });
  }
  const dup = db.prepare('SELECT id FROM trip_destinations WHERE trip_id = ? AND destination_id = ?').get(trip.id, destId);
  if (dup) return res.status(409).json({ error: 'Destination is already in this trip.' });
  db.prepare('INSERT INTO trip_destinations (trip_id, destination_id, days) VALUES (?, ?, ?)').run(trip.id, destId, days);
  res.status(201).json(loadTrip(trip.id));
});

// Update days of a destination in trip
router.put('/:id/destinations/:destId', (req, res) => {
  const trip = ownTrip(req, res); if (!trip) return;
  if (trip.status === 'booked') return res.status(409).json({ error: 'Booked trips cannot be edited.' });
  const days = Number(req.body?.days);
  if (!Number.isInteger(days) || days < 1) return res.status(400).json({ error: 'Validation failed.', errors: { days: 'Days must be a whole number of at least 1.' } });
  const info = db.prepare('UPDATE trip_destinations SET days = ? WHERE trip_id = ? AND destination_id = ?').run(days, trip.id, req.params.destId);
  if (!info.changes) return res.status(404).json({ error: 'Destination not in this trip.' });
  res.json(loadTrip(trip.id));
});

router.delete('/:id/destinations/:destId', (req, res) => {
  const trip = ownTrip(req, res); if (!trip) return;
  if (trip.status === 'booked') return res.status(409).json({ error: 'Booked trips cannot be edited.' });
  const info = db.prepare('DELETE FROM trip_destinations WHERE trip_id = ? AND destination_id = ?').run(trip.id, req.params.destId);
  if (!info.changes) return res.status(404).json({ error: 'Destination not in this trip.' });
  res.json(loadTrip(trip.id));
});

module.exports = router;
module.exports.loadTrip = loadTrip;
