const FACULTY_IMAGE_EXTENSION = /\.(?:jpe?g|png|webp)$/i;

export function isCloudinaryFacultyPhotoUrl(value, cloudName) {
  if (typeof value !== 'string' || !value || !cloudName) return false;

  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'res.cloudinary.com' ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) return false;

    const segments = url.pathname.split('/').filter(Boolean);
    return segments.length === 7 &&
      segments[0] === cloudName &&
      segments[1] === 'image' &&
      segments[2] === 'upload' &&
      /^v\d+$/.test(segments[3]) &&
      segments[4] === 'sgsits' &&
      segments[5] === 'faculty' &&
      FACULTY_IMAGE_EXTENSION.test(segments[6]);
  } catch {
    return false;
  }
}

export function cloudinaryFacultyPhotoPublicId(value, cloudName) {
  if (!isCloudinaryFacultyPhotoUrl(value, cloudName)) return '';

  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean);
    const filename = decodeURIComponent(segments[6]);
    const stem = filename.replace(FACULTY_IMAGE_EXTENSION, '');
    if (!/^[A-Za-z0-9_-]+$/.test(stem)) return '';
    return `sgsits/faculty/${stem}`;
  } catch {
    return '';
  }
}
