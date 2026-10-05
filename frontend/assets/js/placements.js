import { escapeHtml } from './shared/dom.js';
import { safeHttpsUrl } from './shared/security.js';
import { placementService } from './services/placement.service.js';

const list = document.querySelector('#placementList');
const count = document.querySelector('#placementCount');

function validPublicUrl(value) {
  return safeHttpsUrl(value);
}

function placementUrl(item){return validPublicUrl(item.sourceType==='pdf'?item.document?.url:item.sheetUrl)}

async function loadPlacements() {
  let records=[];
  try {
    records = await placementService.listPublic();
  } catch {}
  const placements = records
    .filter((item) => (!item.status || item.status === 'published') && placementUrl(item))
    .sort((a, b) => (b.academicYear || '').localeCompare(a.academicYear || ''));

  count.textContent = `${placements.length} published ${placements.length === 1 ? 'sheet' : 's'}`;
  list.innerHTML = placements.length
    ? placements.map((item) => `<a class="placement-row" href="${escapeHtml(placementUrl(item))}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(item.title || `Placement ${item.academicYear}`)}</strong><span>Open official ${item.sourceType==='pdf'?'PDF':'sheet'} ?</span></a>`).join('')
    : '<p class="empty-state">No placement sheets have been published yet.<br>Please check again after the Training &amp; Placement Office updates the archive.</p>';
}

document.querySelector('#currentYear').textContent = new Date().getFullYear();
loadPlacements();
