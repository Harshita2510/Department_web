import { API_BASE_URL } from '../config/api.js';

export async function apiRequest(path, options = {}) {
  const isFormData=options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { ...(isFormData?{}:{'Content-Type':'application/json'}), ...(options.headers || {}) },
    ...options
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || `Request failed with status ${response.status}`);
    error.details = payload?.details;
    throw error;
  }
  return payload?.data ?? payload;
}
