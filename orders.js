const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');

const router = express.Router();

// POST /api/orders - buat order baru dari isi keranjang
router.post('/', async (req, res, next) => {
  const { items, customer } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Keranjang tidak boleh kosong' });
  }
  if (!customer || !customer.name || !customer.phone || !customer.address) {
    return res.status(400).json({ error: 'Data pelanggan (nama, telepon, alamat) wajib diisi' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderItems = [];
    let total = 0;

    for (const item of items) {
      // FOR UPDATE mengunci baris produk supaya aman dari race condition saat stok berkurang
      const result = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
      const product = result.rows[0];
      if (!product) {
        const e = new Error(`Produk dengan id ${item.productId} tidak ditemukan`);
        e.status = 400;
        throw e;
      }
      const qty = Number(item.qty) || 1;
      if (qty > product.stock) {
        const e = new Error(`Stok "${product.name}" tidak mencukupi (sisa ${product.stock})`);
        e.status = 400;
        throw e;
      }
      const subtotal = product.price * qty;
      total += subtotal;
      orderItems.push({ productId: product.id, name: product.name, price: product.price, qty, subtotal });
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [qty, product.id]);
    }

    const id = uuidv4();
    const result = await client.query(
      `INSERT INTO orders (id, items, customer, total, status, payment)
       VALUES ($1, $2, $3, $4, 'pending_payment', NULL) RETURNING *`,
      [id, JSON.stringify(orderItems), JSON.stringify(customer), total]
    );

    await client.query('COMMIT');
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/orders/:id - detail order
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order tidak ditemukan' });
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
