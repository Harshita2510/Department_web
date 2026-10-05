import { timetableProgrammes } from '../data/timetable.data.js';
import { academicDocumentService } from '../services/academic-document.service.js';
import { escapeHtml } from '../shared/dom.js';
import { safeHttpsUrl } from '../shared/security.js';
import { bindResourceDocumentSearch } from '../components/resource-document-search.js';
import { bindResourceDocumentViewer } from '../components/resource-document-viewer.js';

const roman=['I','II','III','IV','V','VI','VII','VIII'];
const slotLabels={classTable:'Class timetable',quiz:'Quiz timetable',practical:'Practical examination timetable',mst1:'MST 1',mst2:'MST 2',mst3:'MST 3',endSemester:'End Semester'};
const examSlots=['quiz','practical','mst1','mst2','mst3','endSemester'];
const programmeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z"></path><path d="M6 11.2v5.2c2.8 2.2 9.2 2.2 12 0v-5.2M21.5 9v6"></path></svg>';
const documentIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.8h8l4 4V21H6z"></path><path d="M14 2.8V7h4M9 12h6M9 16h6"></path></svg>';
const eyeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>';
const downloadIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14"></path></svg>';

function formatFileSize(bytes){
  if(!Number.isFinite(Number(bytes))||Number(bytes)<=0)return '';
  return Number(bytes)>=1024*1024?`${(Number(bytes)/(1024*1024)).toFixed(1)} MB`:`${Math.max(1,Math.round(Number(bytes)/1024))} KB`;
}

function fileLink(slot,label){
  const url=safeHttpsUrl(slot?.asset?.url);
  const type=slot?.asset?.mimeType==='application/pdf'?'PDF':'IMAGE';
  if(!url)return '';
  const safeUrl=escapeHtml(url);
  const safeLabel=escapeHtml(label);
  return `<div class="timetable-file resource-document"><span class="document-icon" aria-hidden="true">${documentIcon}</span><span class="document-copy"><strong>${safeLabel}</strong><small>${type} · Official timetable</small></span><span class="document-size">${escapeHtml(formatFileSize(slot.asset?.size))}</span><span class="document-actions"><button class="document-action document-view" type="button" data-resource-view data-url="${safeUrl}" data-title="${safeLabel}" data-mime-type="${escapeHtml(slot.asset?.mimeType||'application/pdf')}" aria-label="View ${safeLabel}">${eyeIcon}<span>View</span></button><a class="document-action document-download" href="${safeUrl}" download aria-label="Download ${safeLabel}" title="Download">${downloadIcon}</a></span></div>`;
}

function semesterMarkup(semester){
  const files=semester.timetableFiles||{};
  const classTable=fileLink(files.classTable,slotLabels.classTable);
  const exams=examSlots.map((slot)=>fileLink(files[slot],slotLabels[slot])).filter(Boolean);
  const count=(classTable?1:0)+exams.length;
  return `<li class="semester-item"><details class="semester-group"><summary><span><strong>Semester ${roman[semester.number-1]}</strong><small>${count} timetable file${count===1?'':'s'} published</small></span><i aria-hidden="true"></i></summary><div class="timetable-groups">${classTable?`<section><h3>Class timetable</h3>${classTable}</section>`:''}${exams.length?`<section><h3>Exam, quiz &amp; practical timetables</h3><div class="exam-timetable-grid">${exams.join('')}</div></section>`:''}</div></details></li>`;
}

function render(programmes){
  const container=document.querySelector('#programmeList');
  if(!programmes.length){
    container.innerHTML='<div class="timetable-public-empty"><strong>No timetables have been published yet.</strong><span>Uploaded and administrator-approved schedules will appear here automatically.</span></div>';
    return;
  }
  container.innerHTML=programmes.map((programme,index)=>`<details class="programme" ${index===0?'open':''}><summary><span class="programme-icon" aria-hidden="true">${programmeIcon}</span><span class="programme-heading"><small>${escapeHtml(programme.level)}</small><strong>${escapeHtml(programme.title)}</strong><em>${escapeHtml(programme.duration)}</em></span><i aria-hidden="true"></i></summary><div class="programme-content"><p>Only semesters and timetable categories with a published file are shown.</p><ol>${programme.semesters.map(semesterMarkup).join('')}</ol></div></details>`).join('');
  container.querySelectorAll('.programme').forEach((details)=>details.addEventListener('toggle',()=>{if(details.open)container.querySelectorAll('.programme').forEach((item)=>{if(item!==details)item.open=false})}));
  bindResourceDocumentSearch({ input:document.querySelector('#resourceSearch'), container });
  bindResourceDocumentViewer(container);
}

async function load(){
  try{
    const documents=await academicDocumentService.listPublic('timetable');
    const programmes=timetableProgrammes.map((programme)=>({
      ...programme,
      semesters:documents
        .filter((document)=>document.programme===programme.id&&Object.values(document.timetableFiles||{}).some((slot)=>safeHttpsUrl(slot?.asset?.url)))
        .sort((a,b)=>a.semester-b.semester)
        .map((document)=>({number:document.semester,timetableFiles:document.timetableFiles}))
    })).filter((programme)=>programme.semesters.length);
    render(programmes);
  }catch{render([])}
}

load();
document.querySelector('#currentYear').textContent=new Date().getFullYear();
