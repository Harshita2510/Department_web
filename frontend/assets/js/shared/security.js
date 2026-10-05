export function safeHttpsUrl(value, fallback = '') {
  try {
    const url = new URL(value);
    const localDevelopmentUrl=url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);
    return url.protocol === 'https:' || localDevelopmentUrl ? url.href : fallback;
  } catch {
    return fallback;
  }
}
