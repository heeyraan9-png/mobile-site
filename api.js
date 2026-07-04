// Base URL API. Karena frontend disajikan oleh backend yang sama (server.js),
// path relatif "/api" sudah cukup dan otomatis ikut host/port yang sedang diakses.
const API_BASE = '/api';

async function apiRequest(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada server');
  }
  return data;
}

const Api = {
  getProducts: () => apiRequest('/products'),
  getProduct: (id) => apiRequest(`/products/${id}`),
  addProduct: (payload, adminToken) =>
    apiRequest('/products', {
      method: 'POST',
      headers: { 'x-admin-token': adminToken },
      body: JSON.stringify(payload)
    }),
  updateProduct: (id, payload, adminToken) =>
    apiRequest(`/products/${id}`, {
      method: 'PUT',
      headers: { 'x-admin-token': adminToken },
      body: JSON.stringify(payload)
    }),
  deleteProduct: (id, adminToken) =>
    apiRequest(`/products/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': adminToken }
    }),
  createOrder: (payload) =>
    apiRequest('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  getOrder: (id) => apiRequest(`/orders/${id}`),
  createQrisPayment: (orderId) =>
    apiRequest(`/payment/qris/${orderId}`, { method: 'POST' }),
  getPaymentStatus: (orderId) => apiRequest(`/payment/status/${orderId}`),
  simulatePayment: (orderId) =>
    apiRequest(`/payment/simulate/${orderId}`, { method: 'POST' })
};
