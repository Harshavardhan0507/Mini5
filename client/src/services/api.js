const API_BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}/api`;

function getAuthHeader() {
  const token = localStorage.getItem('kisan_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function registerUser(userData) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return res.json();
}

export async function loginUser(credentials) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return res.json();
}

export async function verifyUserToken(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function fetchProducts(category = 'all', search = '') {
  let url = `${API_BASE}/products?category=${encodeURIComponent(category)}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const res = await fetch(url);
  return res.json();
}

export async function fetchProductById(id) {
  const res = await fetch(`${API_BASE}/products/${id}`);
  return res.json();
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
  return res.json();
}

export async function sendChatMessage(message, language = 'en') {
  const res = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ message, language })
  });
  return res.json();
}

export async function placeOrder(orderData) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(orderData)
  });
  return res.json();
}

export async function fetchUserOrders(userId) {
  const res = await fetch(`${API_BASE}/orders/user/${userId}`, {
    headers: getAuthHeader()
  });
  return res.json();
}

export async function fetchMyOrders() {
  const res = await fetch(`${API_BASE}/orders/my-orders`, {
    headers: getAuthHeader()
  });
  return res.json();
}

export async function fetchDiagnosisHistory() {
  const res = await fetch(`${API_BASE}/chat/history`, {
    headers: getAuthHeader()
  });
  return res.json();
}
