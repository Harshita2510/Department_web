export function formatDate(value, includeTime = false) {
  if (!value) return '—';
  const options = includeTime
    ? { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' }
    : { day:'numeric', month:'short', year:'numeric' };
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(value));
}
