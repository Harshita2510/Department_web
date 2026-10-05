const FACULTY_IMAGE_EXTENSION = /\.(?:jpe?g|png|webp)$/i;

// Fail closed: only URLs created by the faculty-photo Cloudinary upload are rendered.
export function facultyPhotoUrl(value, width) {
  if (!value) return '';
  try {
    const url = new URL(value);
    const segments = url.pathname.split('/').filter(Boolean);
    const valid = url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      !url.port && !url.username && !url.password && !url.search && !url.hash &&
      segments.length === 7 && segments[1] === 'image' && segments[2] === 'upload' &&
      /^v\d+$/.test(segments[3]) && segments[4] === 'sgsits' && segments[5] === 'faculty' &&
      FACULTY_IMAGE_EXTENSION.test(segments[6]);
    if (!valid) return '';
    const size = Math.min(800, Math.max(1, Math.round(width)));
    if (!Number.isFinite(size)) return '';
    url.pathname = `/${segments.slice(0,3).join('/')}/f_auto,q_auto,c_limit,w_${size}/${segments.slice(3).join('/')}`;
    return url.href;
  } catch {
    return '';
  }
}
