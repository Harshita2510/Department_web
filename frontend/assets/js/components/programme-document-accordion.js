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

function semesterMarkup(item) {
  const semester=romanNumerals[item.number-1];
  const subjects=item.subjects||[];
  return `<li class="semester-item" data-semester-panel="${item.number}" hidden><div class="subject-list"><ol>${subjects.map(subjectMarkup).join('')}</ol></div></li>`;
}

export function renderProgrammeDocuments({ container, programmes, documentName, notice }) {
  const visibleProgrammes=documentName==='syllabus'
    ?programmes.filter((programme)=>programme.semesters.some((semester)=>(semester.subjects||[]).length))
    :programmes;

  container.innerHTML = visibleProgrammes.length ? visibleProgrammes.map((programme, index) => {
    const populatedSemesters=programme.semesters.filter((semester)=>(semester.subjects||[]).length);
    return `
    <details class="programme" ${index === 0 ? 'open' : ''}>
      <summary><span class="programme-icon" aria-hidden="true">${programmeIcon}</span><span class="programme-heading"><small>${escapeHtml(programme.level)}</small><strong>${escapeHtml(programme.title)}</strong><em>${escapeHtml(programme.duration)}</em></span><i aria-hidden="true"></i></summary>
      <div class="programme-content">${documentName==='syllabus'?`<p>Choose a semester to see its subjects, then view or download an individual syllabus.</p><div class="semester-picker" role="group" aria-label="Choose a semester for ${escapeHtml(programme.title)}">${populatedSemesters.map((item)=>`<button type="button" data-semester-choice="${item.number}">Semester ${romanNumerals[item.number-1]} <span>${item.subjects.length} ${item.subjects.length===1?'subject':'subjects'}</span></button>`).join('')}</div><ol class="semester-subject-panels">${populatedSemesters.map((item) => semesterMarkup(item)).join('')}</ol>`:`<p>Select a semester to open its official ${escapeHtml(documentName)} PDF.</p><ol>${programme.semesters.map((item) => documentMarkup(item, programme, documentName)).join('')}</ol>`}</div>
    </details>
  `;
  }).join('') : '<p class="resource-search-empty">No subject syllabi have been published yet.</p>';

  container.querySelectorAll('.programme').forEach((details) => details.addEventListener('toggle', () => {
    if (!details.open) return;
    container.querySelectorAll('.programme').forEach((programme) => { if (programme !== details) programme.open = false; });
  }));

  container.querySelectorAll('[data-semester-choice]').forEach((button) => button.addEventListener('click', () => {
    const programme=button.closest('.programme');
    const selectedSemester=button.dataset.semesterChoice;
    programme.querySelectorAll('[data-semester-choice]').forEach((choice)=>{
      const selected=choice===button;
      choice.classList.toggle('selected',selected);
      choice.setAttribute('aria-pressed',String(selected));
    });
    programme.querySelectorAll('[data-semester-panel]').forEach((panel)=>{
      panel.hidden=panel.dataset.semesterPanel!==selectedSemester;
    });
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
