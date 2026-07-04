const express = require('express');
const QRCode = require('qrcode');
const { pool } = require('../db');

const router = express.Router();

const PAYMENT_MODE = process.env.PAYMENT_MODE || 'sandbox';
const MERCHANT_NAME = process.env.MERCHANT_NAME || 'Toko Demo QRIS';
const EXPIRY_MINUTES = 15;

async function findOrder(orderId) {
  const result = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  return result.rows[0] || null;
}

/**
 * Membuat payload QRIS.
 * - Mode "sandbox": membuat string QR dummy sendiri (tanpa akun payment gateway apapun),
 *   supaya seluruh alur bisa langsung dicoba/di-demo tanpa API key.
 * - Mode "midtrans" / "xendit": kerangka sudah disiapkan, tinggal isi kredensial
 *   di file .env dan lengkapi pemanggilan API sesuai dokumentasi resmi masing-masing provider.
 */
async function generateQrisPayload(order) {
  if (PAYMENT_MODE === 'midtrans') {
    // ================= INTEGRASI MIDTRANS (Core API - QRIS) =================
    // Dokumentasi: https://docs.midtrans.com/docs/qris-qr-code-payments
    // const axios = require('axios');
    // const serverKey = process.env.MIDTRANS_SERVER_KEY;
    // const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    // const baseUrl = isProd ? 'https://api.midtrans.com/v2/charge' : 'https://api.sandbox.midtrans.com/v2/charge';
    // const response = await axios.post(baseUrl, {
    //   payment_type: 'qris',
    //   transaction_details: { order_id: order.id, gross_amount: order.total },
    //   qris: { acquirer: 'gopay' }
    // }, {
    //   headers: {
    //     Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
    //     'Content-Type': 'application/json'
    //   }
    // });
    // const qrAction = response.data.actions.find(a => a.name === 'generate-qr-code');
    // return { qrString: null, qrImageUrl: qrAction.url, raw: response.data };

    throw new Error('Mode midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY di .env lalu lengkapi kode di routes/payment.js');
  }

  if (PAYMENT_MODE === 'xendit') {
    // ================= INTEGRASI XENDIT (QR Code API) =================
    // Dokumentasi: https://developers.xendit.co/api-reference/#create-qr-code
    // const axios = require('axios');
    // const secretKey = process.env.XENDIT_SECRET_KEY;
    // const response = await axios.post('https://api.xendit.co/qr_codes', {
    //   external_id: order.id,
    //   type: 'DYNAMIC',
    //   callback_url: 'https://domain-anda.com/api/payment/webhook/xendit',
    //   amount: order.total
    // }, {
    //   headers: {
    //     Authorization: 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
    //     'Content-Type': 'application/json'
    //   }
    // });
    // return { qrString: response.data.qr_string, qrImageUrl: null, raw: response.data };

    throw new Error('Mode xendit belum dikonfigurasi. Isi XENDIT_SECRET_KEY di .env lalu lengkapi kode di routes/payment.js');
  }

  // ================= MODE SANDBOX (default, tanpa akun gateway apapun) =================
  const qrString = [
    '00020101021226',
    `MERCHANT:${MERCHANT_NAME}`,
    `ORDERID:${order.id}`,
    `AMOUNT:${order.total}`,
    `TIME:${Date.now()}`
  ].join('|');

  return { qrString, qrImageUrl: null, raw: null };
}

// POST /api/payment/qris/:orderId - membuat pembayaran QRIS untuk sebuah order
router.post('/qris/:orderId', async (req, res) => {
  try {
    const order = await findOrder(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });
    if (order.status === 'paid') return res.status(400).json({ error: 'Order sudah dibayar' });

    const { qrString, qrImageUrl } = await generateQrisPayload(order);
    const qrDataUrl = qrImageUrl || (await QRCode.toDataURL(qrString));

    const now = Date.now();
    const payment = {
      method: 'qris',
      mode: PAYMENT_MODE,
      qrString,
      qrDataUrl,
      amount: order.total,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + EXPIRY_MINUTES * 60 * 1000).toISOString()
    };

    const result = await pool.query(
      `UPDATE orders SET payment = $1, status = 'pending_payment' WHERE id = $2 RETURNING *`,
      [JSON.stringify(payment), order.id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/status/:orderId - cek status pembayaran (dipoll frontend)
router.get('/status/:orderId', async (req, res) => {
  try {
    let order = await findOrder(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });

    if (
      order.status === 'pending_payment' &&
      order.payment &&
      new Date(order.payment.expiresAt).getTime() < Date.now()
    ) {
      const result = await pool.query(`UPDATE orders SET status = 'expired' WHERE id = $1 RETURNING *`, [order.id]);
      order = result.rows[0];
    }

    res.json({ data: { status: order.status, order } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/simulate/:orderId - [KHUSUS SANDBOX] menandai order sebagai lunas
router.post('/simulate/:orderId', async (req, res) => {
  if (PAYMENT_MODE !== 'sandbox') {
    return res.status(400).json({ error: 'Endpoint simulasi hanya aktif pada PAYMENT_MODE=sandbox' });
  }
  try {
    const order = await findOrder(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order tidak ditemukan' });
    if (order.status === 'paid') return res.json({ data: order });

    const payment = order.payment || {};
    payment.paidAt = new Date().toISOString();

    const result = await pool.query(
      `UPDATE orders SET status = 'paid', payment = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(payment), order.id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= WEBHOOK UNTUK PRODUKSI (isi sesuai provider yang dipakai) =================
router.post('/webhook/midtrans', express.json(), async (req, res) => {
  // const { order_id, transaction_status, fraud_status } = req.body;
  // if (transaction_status === 'settlement' || (transaction_status === 'capture' && fraud_status === 'accept')) {
  //   await pool.query(`UPDATE orders SET status = 'paid' WHERE id = $1`, [order_id]);
  // }
  res.status(200).json({ received: true });
});

router.post('/webhook/xendit', express.json(), async (req, res) => {
  // const { external_id, status } = req.body;
  // if (status === 'COMPLETED') {
  //   await pool.query(`UPDATE orders SET status = 'paid' WHERE id = $1`, [external_id]);
  // }
  res.status(200).json({ received: true });
});

module.exports = router;
