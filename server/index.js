const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const { seedIfEmpty } = require('./seed');

const app = express();
const originalListen = app.listen.bind(app);
app.listen = (...args) => {
  const server = originalListen(...args);
  const originalClose = server.close.bind(server);
  server.close = (...closeArgs) => {
    db.close();
    return originalClose(...closeArgs);
  };
  server.on('close', () => db.close());
  return server;
};

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/destinations', require('./routes/destinations'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/bookings', require('./routes/bookings'));

// Serve built React app (production)
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` }));

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  seedIfEmpty();
  app.listen(PORT, () => console.log(`Travel Planner running on http://localhost:${PORT}`));
}

module.exports = app;
