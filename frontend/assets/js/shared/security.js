export function safeHttpsUrl(value, fallback = '') {
  try {
    const url = new URL(value);
    const localDevelopmentUrl=url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);
    return url.protocol === 'https:' || localDevelopmentUrl ? url.href : fallback;
  } catch {
    return fallback;
  }
}

export async function hashPrototypePassword(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
