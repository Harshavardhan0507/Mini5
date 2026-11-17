// Empty by default so production builds call the API on the same origin (Express serves
// both the storefront and /api). Set VITE_API_URL when the client is hosted separately.
const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

function getAuthHeader() {
  const token = localStorage.getItem('kisan_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parse(res) {
  try {
    return await res.json();
  } catch {
    return { success: false, message: `Unexpected server response (${res.status}).` };
  }
}

export async function registerUser(userData) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return parse(res);
}

export async function loginUser(credentials) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return parse(res);
}

export async function verifyUserToken(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parse(res);
}

export async function fetchProducts(category = 'all', search = '') {
  let url = `${API_BASE}/products?category=${encodeURIComponent(category)}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const res = await fetch(url);
  return parse(res);
}

export async function fetchProductById(id) {
  const res = await fetch(`${API_BASE}/products/${id}`);
  return parse(res);
}

export async function diagnoseCropWithPhoto(file, message = '', language = 'en') {
  const formData = new FormData();
  if (file) {
    formData.append('image', file);
  }
  formData.append('message', message);
  formData.append('language', language);

  const res = await fetch(`${API_BASE}/chat/diagnose`, {
    method: 'POST',
    headers: getAuthHeader(), // FormData sets Content-Type automatically
    body: formData
  });
  return parse(res);
}

export async function sendChatMessage(message, language = 'en') {
  const res = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ message, language })
  });
  return parse(res);
}

/* --------------------------------- Orders --------------------------------- */

export async function placeOrder(orderData) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(orderData)
  });
  return parse(res);
}

export async function fetchMyOrders() {
  const res = await fetch(`${API_BASE}/orders/my-orders`, {
    headers: getAuthHeader()
  });
  return parse(res);
}

export async function fetchOrderById(orderId) {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
    headers: getAuthHeader()
  });
  return parse(res);
}

export async function cancelOrder(orderId, reason = 'Cancelled by customer') {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ reason })
  });
  return parse(res);
}

export async function fetchDiagnosisHistory() {
  const res = await fetch(`${API_BASE}/chat/history`, {
    headers: getAuthHeader()
  });
  return parse(res);
}

export async function fetchChatStatus() {
  const res = await fetch(`${API_BASE}/chat/status`);
  return parse(res);
}

/* ---------------------------------- Admin --------------------------------- */

async function adminRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}/admin${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeader(),
      ...(options.headers || {})
    }
  });
  return parse(res);
}

export function fetchAdminStats() {
  return adminRequest('/stats');
}

export function fetchAdminProducts() {
  return adminRequest('/products');
}

export function createProduct(product) {
  return adminRequest('/products', { method: 'POST', body: JSON.stringify(product) });
}

export function updateProduct(id, product) {
  return adminRequest(`/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(product)
  });
}

export function deleteProduct(id) {
  return adminRequest(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchAdminOrders(status = '') {
  return adminRequest(`/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`);
}

export function updateOrderStatus(id, status, note = '') {
  return adminRequest(`/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note })
  });
}

export function updateOrderPayment(id, paymentStatus, paymentReference = '') {
  return adminRequest(`/orders/${encodeURIComponent(id)}/payment`, {
    method: 'PATCH',
    body: JSON.stringify({ paymentStatus, paymentReference })
  });
}

export function resendOrderEmail(id) {
  return adminRequest(`/orders/${encodeURIComponent(id)}/notify`, { method: 'POST' });
}

export function fetchAdminCustomers() {
  return adminRequest('/customers');
}

export function fetchAdminEmails() {
  return adminRequest('/emails');
}
