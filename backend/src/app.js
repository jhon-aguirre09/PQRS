const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const pqrsRoutes = require('./routes/pqrs');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:4200' }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/pqrs', pqrsRoutes);
app.use((req, res) => res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.path}` }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Ocurrió un error interno. Intenta nuevamente.' });
});

module.exports = app;
