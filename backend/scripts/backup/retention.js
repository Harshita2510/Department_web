export const KEEP_RECENT = 10;
export const KEEP_MONTHS = 6;

const monthKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// Keeps the newest KEEP_RECENT backups plus the newest backup of each of the last KEEP_MONTHS
// calendar months (the current month included). Everything else is returned for removal.
export function selectExpired(files, now = new Date()) {
  const newestFirst = [...files].sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
  const keep = new Set(newestFirst.slice(0, KEEP_RECENT).map(file => file.id));

  const months = new Set();
  for (let offset = 0; offset < KEEP_MONTHS; offset++) months.add(monthKey(new Date(now.getFullYear(), now.getMonth() - offset, 1)));
  const keptMonths = new Set();
  for (const file of newestFirst) {
    const key = monthKey(new Date(file.createdTime));
    if (months.has(key) && !keptMonths.has(key)) {
      keptMonths.add(key);
      keep.add(file.id);
    }
  }
  return newestFirst.filter(file => !keep.has(file.id));
}
