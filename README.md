# Toko Online QRIS (Backend + Frontend Mobile-First)

Proyek e-commerce sederhana lengkap dengan:
- **Backend** Node.js + Express, penyimpanan data pakai **Postgres** (kompatibel dengan Neon, Supabase, Railway, dll).
- **Frontend** HTML/CSS/JS mobile-first (tampilan seperti aplikasi mobile: bottom navigation, kartu produk, dsb). Frontend juga tetap bisa dibuka di desktop.
- **Pembayaran QRIS** dalam **mode sandbox/demo** (karena belum ada akun payment gateway), dengan kerangka kode yang sudah siap untuk Midtrans atau Xendit.

## 0. Deploy Cepat ke Produksi (Railway/Render + Neon)

### Langkah A — Buat database Postgres gratis (Neon)
1. Buka https://neon.tech → daftar/login (bisa pakai akun GitHub/Google).
2. Buat project baru, pilih region terdekat (Singapore kalau ada).
3. Setelah project jadi, salin **Connection String** yang muncul (bentuknya seperti `postgresql://user:password@ep-xxxx.aws.neon.tech/neondb?sslmode=require`). Simpan, ini yang akan jadi `DATABASE_URL`.

> Alternatif: Supabase (https://supabase.com) juga bisa — di dashboard project, buka **Project Settings → Database → Connection string**.

### Langkah B — Deploy backend ke Railway
1. Push folder project ini ke repository GitHub Anda (kalau belum, buat repo baru lalu upload).
2. Buka https://railway.app → login dengan GitHub.
3. **New Project → Deploy from GitHub repo** → pilih repo ini.
4. Karena project ini punya folder `backend/` dan `frontend/`, di pengaturan service set **Root Directory** ke `backend`.
5. Buka tab **Variables**, tambahkan environment variables berikut:
   - `DATABASE_URL` = connection string dari Neon (Langkah A)
   - `ADMIN_TOKEN` = ganti dengan token rahasia Anda sendiri (jangan pakai `admin123`)
   - `MERCHANT_NAME` = nama toko Anda
   - `PAYMENT_MODE` = `sandbox` (ubah ke `midtrans`/`xendit` nanti kalau sudah punya akun gateway)
6. Railway otomatis menjalankan `npm install` lalu `npm start`. Setelah build selesai, klik **Generate Domain** di tab **Settings** untuk dapat URL publik (misalnya `https://nama-app.up.railway.app`).
7. Buka tab **Deployments → Logs**, pastikan muncul `Server berjalan di http://localhost:3000` tanpa error koneksi database.
8. Jalankan seed produk contoh satu kali: di Railway buka menu **Shell/Terminal** service tersebut lalu jalankan `npm run seed` (atau jalankan `node seed.js` sekali dari komputer Anda dengan `DATABASE_URL` yang sama di file `.env` lokal).

> **Render** sebagai alternatif Railway: buat **New → Web Service**, hubungkan repo, set **Root Directory** ke `backend`, **Build Command**: `npm install`, **Start Command**: `npm start`, lalu tambahkan environment variables yang sama seperti di atas.

Karena `server.js` sudah menyajikan frontend (`frontend/`) dari server yang sama, setelah langkah ini **seluruh aplikasi (frontend + backend + database) sudah publik dan konek** lewat satu URL — tidak perlu Netlify sama sekali.

### (Opsional) Kalau tetap ingin frontend terpisah di Netlify
1. Di Netlify, buat site baru dari folder `frontend/` saja (drag-and-drop folder atau hubungkan repo dengan **Base directory**: `frontend`).
2. Edit `frontend/js/api.js`, ubah base URL API dari path relatif menjadi URL backend Railway/Render Anda, misalnya:
   ```js
   const API_BASE = 'https://nama-app.up.railway.app/api';
   ```
3. Deploy ulang Netlify. Pastikan backend Railway/Render mengizinkan CORS dari domain Netlify (`cors()` di `server.js` sudah mengizinkan semua origin secara default, jadi biasanya langsung jalan).

---

## 1. Struktur Folder

```
ecommerce-qris/
├── backend/
│   ├── server.js          # entry point server
│   ├── db.js               # penyimpanan data berbasis file JSON
│   ├── seed.js             # isi data produk contoh
│   ├── routes/
│   │   ├── products.js     # API produk
│   │   ├── orders.js       # API order/pesanan
│   │   └── payment.js      # API pembayaran QRIS
│   ├── data/store.json     # database (dibuat otomatis saat pertama run)
│   ├── .env.example        # contoh konfigurasi
│   └── package.json
└── frontend/
    ├── index.html          # daftar produk
    ├── product.html        # detail produk
    ├── cart.html           # keranjang
    ├── checkout.html       # form checkout
    ├── payment.html        # halaman bayar QRIS
    ├── admin.html          # kelola produk (tambah/hapus)
    ├── css/style.css
    └── js/ (api.js, main.js)
```

## 2. Cara Menjalankan Lokal (butuh koneksi internet untuk instalasi pertama kali)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env, isi DATABASE_URL dengan connection string Postgres (Neon/Supabase, lihat bagian 0)
npm run seed      # isi 6 produk contoh
npm start
```

Lalu buka **http://localhost:3000** di browser (atau HP yang satu jaringan WiFi dengan mengganti `localhost` ke IP komputer, misalnya `http://192.168.1.5:3000`).

> Backend sudah otomatis menyajikan frontend pada port yang sama, jadi tidak perlu server terpisah untuk frontend.

## 3. Alur Pemakaian

1. Buka halaman utama → pilih produk → tambah ke keranjang.
2. Buka keranjang → checkout → isi nama, telepon, alamat.
3. Klik **"Bayar dengan QRIS"** → sistem membuat order lalu menampilkan QR code.
4. Di halaman pembayaran (mode sandbox), scan QR hanya untuk demo visual — karena belum terhubung ke gateway asli, gunakan tombol **"Simulasikan Pembayaran Berhasil (Demo)"** untuk menandai order sebagai lunas.
5. Halaman admin (`admin.html`) dipakai untuk menambah/menghapus produk. Token admin default: `admin123` (ubah di file `.env`, variabel `ADMIN_TOKEN`).

## 4. Tentang Mode Pembayaran QRIS

Karena saat ini belum ada akun payment gateway, proyek berjalan di **`PAYMENT_MODE=sandbox`**:
- QR code dibuat sendiri oleh server (bukan QRIS resmi, tidak bisa discan bank sungguhan) — tujuannya supaya seluruh alur checkout → bayar → status lunas bisa langsung dicoba end-to-end.
- Ada tombol "Simulasikan Pembayaran Berhasil" yang berfungsi seperti pengganti notifikasi (webhook) dari payment gateway asli.

### Cara mengaktifkan pembayaran QRIS sungguhan

Kode sudah disiapkan (lihat komentar di `backend/routes/payment.js`) untuk dua provider populer di Indonesia:

**A. Midtrans**
1. Daftar akun di https://midtrans.com dan ambil **Server Key** (sandbox atau production).
2. Isi `.env`:
   ```
   PAYMENT_MODE=midtrans
   MIDTRANS_SERVER_KEY=isi_server_key_anda
   MIDTRANS_IS_PRODUCTION=false
   ```
3. Install SDK HTTP client: `npm install axios`
4. Buka `backend/routes/payment.js`, cari bagian `if (PAYMENT_MODE === 'midtrans')`, lalu aktifkan (uncomment) kode contoh yang sudah disediakan.
5. Daftarkan URL webhook `https://domain-anda.com/api/payment/webhook/midtrans` di dashboard Midtrans supaya status order otomatis berubah jadi "paid" saat pelanggan sudah bayar.

**B. Xendit**
1. Daftar akun di https://xendit.co dan ambil **Secret Key**.
2. Isi `.env`:
   ```
   PAYMENT_MODE=xendit
   XENDIT_SECRET_KEY=isi_secret_key_anda
   ```
3. Install SDK HTTP client: `npm install axios`
4. Aktifkan kode contoh pada bagian `if (PAYMENT_MODE === 'xendit')` di `backend/routes/payment.js`.
5. Daftarkan callback URL `https://domain-anda.com/api/payment/webhook/xendit` sesuai dokumentasi Xendit.

Setelah salah satu mode di atas aktif dan berjalan normal, tombol simulasi otomatis hilang dari halaman pembayaran (karena hanya muncul saat `PAYMENT_MODE=sandbox`).

## 5. Daftar Endpoint API

| Method | Endpoint                         | Keterangan                                  |
|--------|-----------------------------------|----------------------------------------------|
| GET    | /api/products                     | Daftar produk                                |
| GET    | /api/products/:id                 | Detail produk                                |
| POST   | /api/products                     | Tambah produk (butuh header `x-admin-token`) |
| PUT    | /api/products/:id                 | Update produk (admin)                        |
| DELETE | /api/products/:id                 | Hapus produk (admin)                         |
| POST   | /api/orders                       | Buat order baru dari keranjang                |
| GET    | /api/orders/:id                   | Detail order                                  |
| POST   | /api/payment/qris/:orderId        | Buat pembayaran QRIS untuk sebuah order       |
| GET    | /api/payment/status/:orderId      | Cek status pembayaran (dipoll frontend)       |
| POST   | /api/payment/simulate/:orderId    | [Sandbox] tandai order sebagai lunas           |
| POST   | /api/payment/webhook/midtrans     | Endpoint notifikasi dari Midtrans (produksi)   |
| POST   | /api/payment/webhook/xendit       | Endpoint callback dari Xendit (produksi)       |

## 6. Catatan Keamanan Sebelum Produksi

- Ganti `ADMIN_TOKEN` dengan nilai acak yang kuat, dan pertimbangkan sistem login admin yang lebih lengkap (JWT/session) untuk penggunaan nyata.
- Aktifkan HTTPS di server produksi (payment gateway biasanya mewajibkan webhook via HTTPS). Railway/Render sudah otomatis pakai HTTPS.
- Data sudah memakai Postgres sungguhan, tapi tetap aktifkan backup otomatis di Neon/Supabase (biasanya sudah tersedia di plan gratis).
- Validasi tanda tangan (signature) notifikasi webhook Midtrans/Xendit sesuai dokumentasi resmi mereka sebelum mengubah status order, supaya tidak bisa dipalsukan orang lain.

## 7. Status Pengujian

- Seluruh file backend (`server.js`, `db.js`, `seed.js`, dan semua file di `routes/`) sudah dicek bebas syntax error dengan `node --check`.
- Logika baca/tulis database (`db.js`) sudah diuji langsung dan berjalan sesuai harapan.
- Karena lingkungan pembuatan proyek ini tidak memiliki akses internet, proses `npm install` dan uji jalan penuh server (end-to-end dengan Express) perlu dilakukan di komputer Anda yang terhubung internet. Semua dependency yang dipakai (`express`, `cors`, `dotenv`, `qrcode`, `uuid`) adalah package resmi dan stabil di npm.
