const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { loadTrip } = require('./trips');

const router = express.Router();
router.use(requireAuth);

const PAYMENTS = ['card', 'upi', 'netbanking', 'cash'];

function withTrip(b) {
  if (!b) return b;
  const trip = db.prepare('SELECT title, start_date, end_date FROM trips WHERE id = ?').get(b.trip_id);
  return { ...b, trip };
}

router.get('/', (req, res) => {
  const rows = req.user.role === 'admin' && req.query.all === '1'
    ? db.prepare(`SELECT b.*, u.name AS user_name, u.email AS user_email FROM bookings b JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC, b.id DESC`).all()
    : db.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(req.user.id);
  res.json(rows.map(withTrip));
});

router.get('/:id', (req, res) => {
  const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found.' });
  if (b.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  res.json({ ...withTrip(b), trip_details: loadTrip(b.trip_id) });
});

// Book a trip
router.post('/', (req, res) => {
  const { trip_id, travelers, payment_method } = req.body || {};
  const errors = {};
  const n = Number(travelers);
  if (!Number.isInteger(n) || n < 1 || n > 20) errors.travelers = 'Travelers must be a whole number between 1 and 20.';
  if (!PAYMENTS.includes(payment_method)) errors.payment_method = `Payment method must be one of: ${PAYMENTS.join(', ')}.`;
  if (!trip_id) errors.trip_id = 'Trip is required.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', errors });

  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(trip_id);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });
  if (trip.user_id !== req.user.id) return res.status(403).json({ error: 'You can only book your own trips.' });
  if (trip.status === 'booked') return res.status(409).json({ error: 'This trip is already booked.' });

  const full = loadTrip(trip.id);
  if (!full.destinations.length) return res.status(400).json({ error: 'Add at least one destination before booking.' });
  const today = new Date().toISOString().slice(0, 10);
  if (trip.start_date < today) return res.status(400).json({ error: 'Trip start date is in the past. Please update the dates.' });

  const total = Math.round(full.cost_per_person * n * 100) / 100;
  const ref = 'TRV-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  const tx = db.transaction(() => {
    // A cancelled booking row may exist (trip_id is unique): replace it
    db.prepare('DELETE FROM bookings WHERE trip_id = ?').run(trip.id);
    const info = db.prepare(`INSERT INTO bookings (trip_id, user_id, travelers, total_price, payment_method, booking_ref)
      VALUES (?, ?, ?, ?, ?, ?)`).run(trip.id, req.user.id, n, total, payment_method, ref);
    db.prepare("UPDATE trips SET status = 'booked' WHERE id = ?").run(trip.id);
    return info.lastInsertRowid;
  });
  const id = tx();
  res.status(201).json(withTrip(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id)));
});

// Cancel a booking
router.put('/:id/cancel', (req, res) => {
  const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found.' });
  if (b.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  if (b.status === 'cancelled') return res.status(409).json({ error: 'Booking is already cancelled.' });
  db.transaction(() => {
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(b.id);
    db.prepare("UPDATE trips SET status = 'planned' WHERE id = ?").run(b.trip_id);
  })();
  res.json(withTrip(db.prepare('SELECT * FROM bookings WHERE id = ?').get(b.id)));
});

// Admin stats
router.get('/admin/stats', requireAdmin, (req, res) => {
  res.json({
    users: db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'user'").get().c,
    destinations: db.prepare('SELECT COUNT(*) c FROM destinations').get().c,
    trips: db.prepare('SELECT COUNT(*) c FROM trips').get().c,
    bookings: db.prepare("SELECT COUNT(*) c FROM bookings WHERE status = 'confirmed'").get().c,
    revenue: db.prepare("SELECT COALESCE(SUM(total_price),0) s FROM bookings WHERE status = 'confirmed'").get().s,
  });
});

module.exports = router;
