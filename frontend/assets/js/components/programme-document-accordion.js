import { escapeHtml } from '../shared/dom.js';
import { safeHttpsUrl } from '../shared/security.js';

const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function documentMarkup(item, programme, documentName) {
  const url = safeHttpsUrl(item.documentUrl);
  const semester = romanNumerals[item.number - 1];
  const unavailableLabel = `${programme.title} — Semester ${semester} ${documentName}`;
  if (url) {
    return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><span class="document-icon" aria-hidden="true">PDF</span><span><strong>Semester ${semester}</strong><small>View official ${escapeHtml(documentName)}</small></span><b>Open ↗</b></a></li>`;
  }
  return `<li><button type="button" data-unavailable="${escapeHtml(unavailableLabel)}"><span class="document-icon" aria-hidden="true">PDF</span><span><strong>Semester ${semester}</strong><small>Document awaiting publication</small></span><b>Not published</b></button></li>`;
}

function subjectMarkup(subject) {
  const url=safeHttpsUrl(subject.syllabus?.url);
  const type=subject.syllabus?.mimeType==='application/pdf'?'PDF':'IMAGE';
  return `<li>${url?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">`:'<span class="subject-unavailable">'}<span class="document-icon" aria-hidden="true">${type}</span><span><strong>${escapeHtml(subject.subjectCode?`${subject.subjectCode} · ${subject.name}`:subject.name)}</strong><small>${url?'View official subject syllabus':'Syllabus awaiting publication'}</small></span><b>${url?'Open ↗':'Not published'}</b>${url?'</a>':'</span>'}</li>`;
}

function semesterMarkup(item, programme) {
  const semester=romanNumerals[item.number-1];
  const subjects=item.subjects||[];
  return `<li class="semester-item"><details class="semester-group"><summary><span><strong>Semester ${semester}</strong><small>${subjects.length} ${subjects.length===1?'subject':'subjects'}</small></span><i aria-hidden="true"></i></summary><div class="subject-list"><ol>${subjects.length?subjects.map(subjectMarkup).join(''):`<li class="semester-empty">No subjects have been added for ${escapeHtml(programme.title)} Semester ${semester}.</li>`}</ol></div></details></li>`;
}

export function renderProgrammeDocuments({ container, programmes, documentName, notice }) {
  container.innerHTML = programmes.map((programme, index) => `
    <details class="programme" ${index === 0 ? 'open' : ''}>
      <summary><span><small>${escapeHtml(programme.level)}</small><strong>${escapeHtml(programme.title)}</strong><em>${escapeHtml(programme.duration)}</em></span><i aria-hidden="true"></i></summary>
      <div class="programme-content"><p>${documentName==='syllabus'?'Select a semester, then open a subject syllabus PDF or image.':`Select a semester to open its official ${escapeHtml(documentName)} PDF.`}</p><ol>${programme.semesters.map((item) => documentName==='syllabus'?semesterMarkup(item,programme):documentMarkup(item, programme, documentName)).join('')}</ol></div>
    </details>
  `).join('');

  container.querySelectorAll('.programme').forEach((details) => details.addEventListener('toggle', () => {
    if (!details.open) return;
    container.querySelectorAll('.programme').forEach((programme) => { if (programme !== details) programme.open = false; });
  }));

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
