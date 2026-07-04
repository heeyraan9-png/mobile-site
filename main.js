// ===== Helper umum yang dipakai di semua halaman =====

function formatRupiah(num) {
  return 'Rp' + Number(num).toLocaleString('id-ID');
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ===== Manajemen keranjang (disimpan di localStorage) =====
const CART_KEY = 'ecommerce_qris_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (err) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(product, qty) {
  const cart = getCart();
  const existing = cart.find((item) => item.productId === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      qty
    });
  }
  saveCart(cart);
}

function updateCartItemQty(productId, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter((item) => item.productId !== productId);
  } else {
    const item = cart.find((i) => i.productId === productId);
    if (item) item.qty = qty;
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.productId !== productId);
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function cartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  if (badge) {
    const count = cartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
