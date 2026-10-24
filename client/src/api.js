// Small fetch wrapper: attaches JWT, parses JSON, throws errors with field messages
const TOKEN_KEY = 'wanderly_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

export async function api(path, { method = 'GET', body, params } = {}) {
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://wanderly-api-4mm1.onrender.com').replace(/\/$/, '');
let url = `${API_BASE_URL}/api${path}`;
  if (params) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null && v !== 'all'));
    if ([...qs].length) url += `?${qs}`;
  }
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong.', res.status, data.errors);
  return data;
}

export const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
export const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d9488"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect width="900" height="600" fill="url(#g)"/><text x="450" y="320" font-family="sans-serif" font-size="48" fill="white" text-anchor="middle">Wanderly</text></svg>`);
