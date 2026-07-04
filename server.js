require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDb } = require('./db');
const productsRoute = require('./routes/products');
const ordersRoute = require('./routes/orders');
const paymentRoute = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/products', productsRoute);
app.use('/api/orders', ordersRoute);
app.use('/api/payment', paymentRoute);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.PAYMENT_MODE || 'sandbox' });
});

// Sajikan frontend statis (mobile-first) langsung dari backend yang sama
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Fallback: arahkan route non-API ke index.html (SPA-like navigation aman untuk refresh)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// Error handler umum, supaya server tidak crash diam-diam
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server berjalan di http://localhost:${PORT}`);
      console.log(`Mode pembayaran: ${process.env.PAYMENT_MODE || 'sandbox'}`);
    });
  })
  .catch((err) => {
    console.error('Gagal terhubung/menyiapkan database:', err.message);
    process.exit(1);
  });
