const API_URL = import.meta.env.VITE_API_URL || '/api';
const REQUEST_TIMEOUT_MS = 8000;

export function getToken() {
  return localStorage.getItem('soc_token') || sessionStorage.getItem('soc_token');
}

export function setToken(token, remember) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('soc_token', token);
}

export function clearToken() {
  localStorage.removeItem('soc_token');
  sessionStorage.removeItem('soc_token');
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Backend did not respond. Make sure NestJS is running on ${API_URL.replace('/api', '')}.`);
    }
    throw new Error(`Cannot reach backend at ${API_URL.replace('/api', '')}.`);
  } finally {
    window.clearTimeout(timeout);
  }
  if (path.endsWith('.csv')) return response;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export { API_URL };
