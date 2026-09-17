import { academicCalendars } from '../data/academic-calendar.data.js';
import { escapeHtml } from '../shared/dom.js';
import { safeHttpsUrl } from '../shared/security.js';
import { academicDocumentService } from '../services/academic-document.service.js';

const current = document.querySelector('#currentCalendar');
const archive = document.querySelector('#calendarArchive');
const notice = document.querySelector('#resourceNotice');

function calendarLink(record, currentRecord = false) {
  const url = safeHttpsUrl(record.documentUrl);
  const session=record.session||record.academicYear||'Current session';
  const term=record.title||({odd:'Odd semester',even:'Even semester',annual:'Annual calendar'}[record.term]||record.term||'Academic calendar');
  const published=record.publishedOn||(record.publishedAt?new Date(record.publishedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'');
  const content = `<span class="calendar-icon" aria-hidden="true">${currentRecord ? 'NOW' : 'PDF'}</span><span><small>${escapeHtml(session)}</small><strong>${escapeHtml(term)}</strong>${published ? `<em>Published ${escapeHtml(published)}</em>` : '<em>Official PDF awaiting publication</em>'}</span><b>${url ? 'Open calendar ↗' : 'Not published'}</b>`;
  return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${content}</a>` : `<button type="button" data-unavailable="${escapeHtml(term)}">${content}</button>`;
}

async function loadCalendars(){
  let records=[];try{records=await academicDocumentService.listPublic('academic-calendar')}catch{/* Use the initial empty state. */}
  const currentRecord=records.find((item)=>item.isCurrent)||records[0]||academicCalendars.current;
  const archived=records.filter((item)=>item!==currentRecord);
  current.innerHTML=calendarLink(currentRecord,true);
  archive.innerHTML=archived.length?archived.map((record)=>`<li>${calendarLink(record)}</li>`).join(''):'<li class="archive-empty">Previous semester calendars will remain available here after the first calendar is replaced.</li>';
}
loadCalendars();

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-unavailable]');
  if (!button) return;
  notice.textContent = `${button.dataset.unavailable} academic calendar has not been published yet.`;
  notice.classList.add('show');
  setTimeout(() => notice.classList.remove('show'), 3500);
});
document.querySelector('#currentYear').textContent = new Date().getFullYear();
