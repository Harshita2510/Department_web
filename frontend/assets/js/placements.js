import { escapeHtml } from './shared/dom.js';
import { readJson } from './shared/storage.js';
import { safeHttpsUrl } from './shared/security.js';
import { placementService } from './services/placement.service.js';

const DATA_KEY = 'sgsitsAdminContent';
const list = document.querySelector('#placementList');
const count = document.querySelector('#placementCount');

function validPublicUrl(value) {
  return safeHttpsUrl(value);
}

async function loadPlacements() {
  let records;
  try {
    records = await placementService.listPublic();
  } catch {
    records = readJson(localStorage, DATA_KEY, {}).placements || [];
  }
  const placements = records
    // The public API already returns published records only. The status check is
    // retained for the browser-storage fallback used during offline development.
    .filter((item) => (!item.status || item.status === 'published') && validPublicUrl(item.sheetUrl))
    .sort((a, b) => (b.academicYear || '').localeCompare(a.academicYear || ''));

  count.textContent = `${placements.length} published ${placements.length === 1 ? 'sheet' : 's'}`;
  list.innerHTML = placements.length
    ? placements.map((item) => `<a class="placement-row" href="${escapeHtml(validPublicUrl(item.sheetUrl))}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(item.title || `Placement ${item.academicYear}`)}</strong><span>Open official sheet ↗</span></a>`).join('')
    : '<p class="empty-state">No placement sheets have been published yet.<br>Please check again after the Training &amp; Placement Office updates the archive.</p>';
}

document.querySelector('#currentYear').textContent = new Date().getFullYear();
loadPlacements();
