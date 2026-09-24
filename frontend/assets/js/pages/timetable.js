import { timetableProgrammes } from '../data/timetable.data.js';
import { academicDocumentService } from '../services/academic-document.service.js';
import { escapeHtml } from '../shared/dom.js';
import { safeHttpsUrl } from '../shared/security.js';

const roman=['I','II','III','IV','V','VI','VII','VIII'];
const slotLabels={classTable:'Class timetable',quiz:'Quiz timetable',mst1:'MST 1',mst2:'MST 2',mst3:'MST 3',endSemester:'End Semester'};
const examSlots=['quiz','mst1','mst2','mst3','endSemester'];

function fileLink(slot,label){
  const url=safeHttpsUrl(slot?.asset?.url);
  const type=slot?.asset?.mimeType==='application/pdf'?'PDF':'IMAGE';
  if(!url)return '';
  return `<a class="timetable-file" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><i>${type}</i><span><strong>${label}</strong><small>View official timetable</small></span><b>Open ↗</b></a>`;
}

function semesterMarkup(semester){
  const files=semester.timetableFiles||{};
  const classTable=fileLink(files.classTable,slotLabels.classTable);
  const exams=examSlots.map((slot)=>fileLink(files[slot],slotLabels[slot])).filter(Boolean);
  const count=(classTable?1:0)+exams.length;
  return `<li class="semester-item"><details class="semester-group"><summary><span><strong>Semester ${roman[semester.number-1]}</strong><small>${count} timetable file${count===1?'':'s'} published</small></span><i aria-hidden="true"></i></summary><div class="timetable-groups">${classTable?`<section><h3>Class timetable</h3>${classTable}</section>`:''}${exams.length?`<section><h3>Quiz &amp; exam timetables</h3><div class="exam-timetable-grid">${exams.join('')}</div></section>`:''}</div></details></li>`;
}

function render(programmes){
  const container=document.querySelector('#programmeList');
  if(!programmes.length){
    container.innerHTML='<div class="timetable-public-empty"><strong>No timetables have been published yet.</strong><span>Uploaded and administrator-approved schedules will appear here automatically.</span></div>';
    return;
  }
  container.innerHTML=programmes.map((programme,index)=>`<details class="programme" ${index===0?'open':''}><summary><span><small>${escapeHtml(programme.level)}</small><strong>${escapeHtml(programme.title)}</strong><em>${escapeHtml(programme.duration)}</em></span><i aria-hidden="true"></i></summary><div class="programme-content"><p>Only semesters and timetable categories with a published file are shown.</p><ol>${programme.semesters.map(semesterMarkup).join('')}</ol></div></details>`).join('');
  container.querySelectorAll('.programme').forEach((details)=>details.addEventListener('toggle',()=>{if(details.open)container.querySelectorAll('.programme').forEach((item)=>{if(item!==details)item.open=false})}));
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
