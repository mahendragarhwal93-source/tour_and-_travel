const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Use an isolated temp database for tests
const dbFile = path.join(os.tmpdir(), `travel-test-${Date.now()}.db`);
process.env.DB_FILE = dbFile;

const app = require('../index');
const { seedIfEmpty } = require('../seed');

let server, base, userToken, adminToken, tripId, destId;

async function api(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

before(async () => {
  seedIfEmpty();
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  for (const s of ['', '-wal', '-shm']) fs.rmSync(dbFile + s, { force: true });
});

test('health check', async () => {
  const r = await api('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.status, 'ok');
});

test('register validation errors', async () => {
  const r = await api('POST', '/api/auth/register', { name: 'A', email: 'bad', password: '1' });
  assert.equal(r.status, 400);
  assert.ok(r.data.errors.name && r.data.errors.email && r.data.errors.password);
});

test('register, duplicate email, login', async () => {
  const r = await api('POST', '/api/auth/register', { name: 'Test User', email: 'test@x.com', password: 'secret1' });
  assert.equal(r.status, 201);
  assert.ok(r.data.token);
  userToken = r.data.token;
  const dup = await api('POST', '/api/auth/register', { name: 'Test User', email: 'TEST@x.com', password: 'secret1' });
  assert.equal(dup.status, 409);
  const bad = await api('POST', '/api/auth/login', { email: 'test@x.com', password: 'wrong' });
  assert.equal(bad.status, 401);
  const ok = await api('POST', '/api/auth/login', { email: 'test@x.com', password: 'secret1' });
  assert.equal(ok.status, 200);
  const admin = await api('POST', '/api/auth/login', { email: 'admin@travel.com', password: 'admin123' });
  assert.equal(admin.status, 200);
  assert.equal(admin.data.user.role, 'admin');
  adminToken = admin.data.token;
});

test('protected routes need a valid token', async () => {
  assert.equal((await api('GET', '/api/trips')).status, 401);
  assert.equal((await api('GET', '/api/trips', null, 'garbage')).status, 401);
  assert.equal((await api('GET', '/api/auth/me', null, userToken)).status, 200);
});

test('destinations list, search and filters', async () => {
  const all = await api('GET', '/api/destinations');
  assert.equal(all.status, 200);
  assert.ok(all.data.length >= 10);
  destId = all.data[0].id;
  const beach = await api('GET', '/api/destinations?category=Beach');
  assert.ok(beach.data.length > 0 && beach.data.every(d => d.category === 'Beach'));
  const search = await api('GET', '/api/destinations?search=goa');
  assert.ok(search.data.some(d => d.name === 'Goa'));
  const cheap = await api('GET', '/api/destinations?maxPrice=3000&sort=price_asc');
  assert.ok(cheap.data.every(d => d.price_per_day <= 3000));
  const prices = cheap.data.map(d => d.price_per_day);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  assert.equal((await api('GET', '/api/destinations/99999')).status, 404);
});

test('only admin can create/update/delete destinations', async () => {
  const body = { name: 'Test Place', country: 'India', category: 'Nature', description: 'd', image: 'http://x/y.jpg', price_per_day: 1000 };
  assert.equal((await api('POST', '/api/destinations', body, userToken)).status, 403);
  assert.equal((await api('POST', '/api/destinations', { name: '' }, adminToken)).status, 400);
  const c = await api('POST', '/api/destinations', body, adminToken);
  assert.equal(c.status, 201);
  const u = await api('PUT', `/api/destinations/${c.data.id}`, { price_per_day: 1500 }, adminToken);
  assert.equal(u.status, 200);
  assert.equal(u.data.price_per_day, 1500);
  assert.equal((await api('DELETE', `/api/destinations/${c.data.id}`, null, adminToken)).status, 204);
  assert.equal((await api('DELETE', `/api/destinations/${c.data.id}`, null, adminToken)).status, 404);
});

test('trip planning: create, add/update/remove destinations, totals', async () => {
  const bad = await api('POST', '/api/trips', { title: 'x', start_date: '2030-01-10', end_date: '2030-01-05' }, userToken);
  assert.equal(bad.status, 400);
  const t = await api('POST', '/api/trips', { title: 'Summer Trip', start_date: '2030-05-01', end_date: '2030-05-07' }, userToken);
  assert.equal(t.status, 201);
  tripId = t.data.id;
  const a = await api('POST', `/api/trips/${tripId}/destinations`, { destination_id: destId, days: 3 }, userToken);
  assert.equal(a.status, 201);
  assert.equal(a.data.destinations.length, 1);
  assert.equal(a.data.cost_per_person, a.data.destinations[0].price_per_day * 3);
  assert.equal((await api('POST', `/api/trips/${tripId}/destinations`, { destination_id: destId }, userToken)).status, 409);
  const u = await api('PUT', `/api/trips/${tripId}/destinations/${destId}`, { days: 5 }, userToken);
  assert.equal(u.data.destinations[0].days, 5);
  assert.equal((await api('PUT', `/api/trips/${tripId}/destinations/${destId}`, { days: 0 }, userToken)).status, 400);
});

test("a user cannot access another user's trip", async () => {
  const other = await api('POST', '/api/auth/register', { name: 'Other', email: 'other@x.com', password: 'secret1' });
  assert.equal((await api('GET', `/api/trips/${tripId}`, null, other.data.token)).status, 403);
  assert.equal((await api('DELETE', `/api/trips/${tripId}`, null, other.data.token)).status, 403);
});

test('booking: validation, success, double booking, edit lock, cancel', async () => {
  assert.equal((await api('POST', '/api/bookings', { trip_id: tripId, travelers: 0, payment_method: 'card' }, userToken)).status, 400);
  assert.equal((await api('POST', '/api/bookings', { trip_id: tripId, travelers: 2, payment_method: 'bitcoin' }, userToken)).status, 400);
  const empty = await api('POST', '/api/trips', { title: 'Empty', start_date: '2030-06-01', end_date: '2030-06-02' }, userToken);
  assert.equal((await api('POST', '/api/bookings', { trip_id: empty.data.id, travelers: 1, payment_method: 'card' }, userToken)).status, 400);

  const trip = await api('GET', `/api/trips/${tripId}`, null, userToken);
  const b = await api('POST', '/api/bookings', { trip_id: tripId, travelers: 2, payment_method: 'upi' }, userToken);
  assert.equal(b.status, 201);
  assert.equal(b.data.total_price, trip.data.cost_per_person * 2);
  assert.match(b.data.booking_ref, /^TRV-[0-9A-F]{8}$/);
  assert.equal((await api('POST', '/api/bookings', { trip_id: tripId, travelers: 1, payment_method: 'card' }, userToken)).status, 409);
  assert.equal((await api('POST', `/api/trips/${tripId}/destinations`, { destination_id: destId }, userToken)).status, 409);
  assert.equal((await api('GET', `/api/trips/${tripId}`, null, userToken)).data.status, 'booked');

  const c = await api('PUT', `/api/bookings/${b.data.id}/cancel`, null, userToken);
  assert.equal(c.status, 200);
  assert.equal(c.data.status, 'cancelled');
  assert.equal((await api('PUT', `/api/bookings/${b.data.id}/cancel`, null, userToken)).status, 409);
  assert.equal((await api('GET', `/api/trips/${tripId}`, null, userToken)).data.status, 'planned');

  // can re-book after cancelling
  const again = await api('POST', '/api/bookings', { trip_id: tripId, travelers: 1, payment_method: 'card' }, userToken);
  assert.equal(again.status, 201);
});

test('admin stats and bookings overview', async () => {
  assert.equal((await api('GET', '/api/bookings/admin/stats', null, userToken)).status, 403);
  const s = await api('GET', '/api/bookings/admin/stats', null, adminToken);
  assert.equal(s.status, 200);
  assert.ok(s.data.bookings >= 1 && s.data.revenue > 0);
  const all = await api('GET', '/api/bookings?all=1', null, adminToken);
  assert.ok(all.data.length >= 1 && all.data[0].user_email);
});

test('invalid JSON and unknown routes return proper errors', async () => {
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
  assert.equal((await api('GET', '/api/nope')).status, 404);
});

test('delete trip', async () => {
  assert.equal((await api('DELETE', `/api/trips/${tripId}`, null, userToken)).status, 204);
  assert.equal((await api('GET', `/api/trips/${tripId}`, null, userToken)).status, 404);
});
