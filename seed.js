const { v4: uuidv4 } = require('uuid');
const { pool, initDb } = require('./db');

const sampleProducts = [
  { name: 'Kaos Polos Premium', price: 85000, stock: 50, image: '👕', description: 'Kaos polos bahan cotton combed 30s, nyaman dan adem dipakai harian.' },
  { name: 'Sepatu Sneakers Casual', price: 250000, stock: 20, image: '👟', description: 'Sepatu sneakers ringan cocok untuk aktivitas sehari-hari.' },
  { name: 'Tas Ransel Anti Air', price: 175000, stock: 30, image: '🎒', description: 'Tas ransel dengan bahan waterproof, muat laptop 14 inch.' },
  { name: 'Botol Minum 1 Liter', price: 45000, stock: 100, image: '🧴', description: 'Botol minum food grade, bebas BPA, kapasitas 1 liter.' },
  { name: 'Topi Baseball', price: 60000, stock: 40, image: '🧢', description: 'Topi baseball adjustable, cocok untuk semua kepala.' },
  { name: 'Jaket Hoodie Fleece', price: 195000, stock: 25, image: '🧥', description: 'Hoodie fleece tebal dan hangat, cocok untuk cuaca dingin.' }
];

async function seed() {
  await initDb();
  const existing = await pool.query('SELECT COUNT(*) FROM products');
  if (Number(existing.rows[0].count) > 0) {
    console.log('Produk sudah ada, seed dilewati. Hapus isi tabel products jika ingin reset.');
    await pool.end();
    return;
  }
  for (const p of sampleProducts) {
    await pool.query(
      `INSERT INTO products (id, name, price, stock, image, description) VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuidv4(), p.name, p.price, p.stock, p.image, p.description]
    );
  }
  console.log(`Berhasil menambahkan ${sampleProducts.length} produk contoh.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Gagal seed database:', err.message);
  process.exit(1);
});
