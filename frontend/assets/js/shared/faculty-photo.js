// Only faculty photo renderers call this helper. Local previews and external URLs stay unchanged.
export function facultyPhotoUrl(value, width) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') return value;
    const prefix = url.pathname.match(/^\/[^/]+\/image\/upload\//)?.[0];
    if (!prefix) return value;
    const size = Math.min(800, Math.max(1, Math.round(width)));
    if (!Number.isFinite(size)) return value;
    url.pathname = `${prefix}f_auto,q_auto,c_limit,w_${size}/${url.pathname.slice(prefix.length)}`;
    return url.href;
  } catch {
    return value;
  }
}
