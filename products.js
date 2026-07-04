const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');

const router = express.Router();

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized: token admin tidak valid' });
  }
  next();
}

// GET /api/products - daftar semua produk
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name');
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

// GET /api/products/:id - detail satu produk
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/products - tambah produk (admin)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, price, stock, image, description } = req.body;
    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'name, price, dan stock wajib diisi' });
    }
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO products (id, name, price, stock, image, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, name, Number(price), Number(stock), image || '🛍️', description || '']
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/products/:id - update produk (admin)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const existing = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    const product = existing.rows[0];
    const { name, price, stock, image, description } = req.body;
    const updated = {
      name: name !== undefined ? name : product.name,
      price: price !== undefined ? Number(price) : product.price,
      stock: stock !== undefined ? Number(stock) : product.stock,
      image: image !== undefined ? image : product.image,
      description: description !== undefined ? description : product.description
    };
    const result = await pool.query(
      `UPDATE products SET name=$1, price=$2, stock=$3, image=$4, description=$5 WHERE id=$6 RETURNING *`,
      [updated.name, updated.price, updated.stock, updated.image, updated.description, req.params.id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/products/:id - hapus produk (admin)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    res.json({ message: 'Produk berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
