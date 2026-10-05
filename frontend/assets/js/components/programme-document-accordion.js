import { escapeHtml } from '../shared/dom.js';
import { safeHttpsUrl } from '../shared/security.js';
import { bindResourceDocumentSearch } from './resource-document-search.js';
import { bindResourceDocumentViewer } from './resource-document-viewer.js';

const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const programmeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z"></path><path d="M6 11.2v5.2c2.8 2.2 9.2 2.2 12 0v-5.2M21.5 9v6"></path></svg>';
const documentIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.8h8l4 4V21H6z"></path><path d="M14 2.8V7h4M9 12h6M9 16h6"></path></svg>';
const eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>';
const downloadIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14"></path></svg>';

function formatFileSize(bytes) {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) return '';
  return Number(bytes) >= 1024 * 1024 ? `${(Number(bytes) / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(Number(bytes) / 1024))} KB`;
}

function documentActions(url, label, mimeType) {
  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(label);
  return `<span class="document-actions"><button class="document-action document-view" type="button" data-resource-view data-url="${safeUrl}" data-title="${safeLabel}" data-mime-type="${escapeHtml(mimeType)}" aria-label="View ${safeLabel}">${eyeIcon}<span>View</span></button><a class="document-action document-download" href="${safeUrl}" download aria-label="Download ${safeLabel}" title="Download">${downloadIcon}</a></span>`;
}

function documentMarkup(item, programme, documentName) {
  const url = safeHttpsUrl(item.documentUrl);
  const semester = romanNumerals[item.number - 1];
  const unavailableLabel = `${programme.title} — Semester ${semester} ${documentName}`;
  if (url) {
    return `<li class="resource-document"><span class="document-icon" aria-hidden="true">${documentIcon}</span><span class="document-copy"><strong>Semester ${semester}</strong><small>Official ${escapeHtml(documentName)}</small></span><span class="document-size"></span>${documentActions(url, `Semester ${semester} ${documentName}`, 'application/pdf')}</li>`;
  }
  return `<li><button type="button" data-unavailable="${escapeHtml(unavailableLabel)}"><span class="document-icon" aria-hidden="true">PDF</span><span><strong>Semester ${semester}</strong><small>Document awaiting publication</small></span><b>Not published</b></button></li>`;
}

function subjectMarkup(subject) {
  const url=safeHttpsUrl(subject.syllabus?.url);
  const type=subject.syllabus?.mimeType==='application/pdf'?'PDF':'IMAGE';
  const label=subject.subjectCode?`${subject.subjectCode} — ${subject.name}`:subject.name;
  return `<li class="resource-document${url?'':' subject-unavailable'}"><span class="document-icon" aria-hidden="true">${documentIcon}</span><span class="document-copy"><strong>${escapeHtml(label)}</strong><small>${url?`${type} · Official subject syllabus`:'Syllabus awaiting publication'}</small></span>${url?`<span class="document-size">${escapeHtml(formatFileSize(subject.syllabus?.size))}</span>${documentActions(url,label,subject.syllabus?.mimeType||'application/pdf')}`:'<span class="document-status">Not published</span>'}</li>`;
}

function semesterMarkup(item, programme) {
  const semester=romanNumerals[item.number-1];
  const subjects=item.subjects||[];
  return `<li class="semester-item"><details class="semester-group"><summary><span><strong>Semester ${semester}</strong><small>${subjects.length} ${subjects.length===1?'subject':'subjects'}</small></span><i aria-hidden="true"></i></summary><div class="subject-list"><ol>${subjects.length?subjects.map(subjectMarkup).join(''):`<li class="semester-empty">No subjects have been added for ${escapeHtml(programme.title)} Semester ${semester}.</li>`}</ol></div></details></li>`;
}

export function renderProgrammeDocuments({ container, programmes, documentName, notice }) {
  container.innerHTML = programmes.map((programme, index) => `
    <details class="programme" ${index === 0 ? 'open' : ''}>
      <summary><span class="programme-icon" aria-hidden="true">${programmeIcon}</span><span class="programme-heading"><small>${escapeHtml(programme.level)}</small><strong>${escapeHtml(programme.title)}</strong><em>${escapeHtml(programme.duration)}</em></span><i aria-hidden="true"></i></summary>
      <div class="programme-content"><p>${documentName==='syllabus'?'Select a semester, then open a subject syllabus PDF or image.':`Select a semester to open its official ${escapeHtml(documentName)} PDF.`}</p><ol>${programme.semesters.map((item) => documentName==='syllabus'?semesterMarkup(item,programme):documentMarkup(item, programme, documentName)).join('')}</ol></div>
    </details>
  `).join('');

  container.querySelectorAll('.programme').forEach((details) => details.addEventListener('toggle', () => {
    if (!details.open) return;
    container.querySelectorAll('.programme').forEach((programme) => { if (programme !== details) programme.open = false; });
  }));

  bindResourceDocumentSearch({ input:document.querySelector('#resourceSearch'), container });
  bindResourceDocumentViewer(container);

  let noticeTimer;
  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-unavailable]');
    if (!button) return;
    notice.textContent = `${button.dataset.unavailable} has not been published yet.`;
    notice.classList.add('show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => notice.classList.remove('show'), 3500);
  });
}
