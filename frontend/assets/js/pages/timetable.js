import { timetableProgrammes } from '../data/timetable.data.js';
import { academicDocumentService } from '../services/academic-document.service.js';
import { escapeHtml } from '../shared/dom.js';
import { safeHttpsUrl } from '../shared/security.js';

const roman=['I','II','III','IV','V','VI','VII','VIII'];
const slotLabels={classTable:'Class timetable',mst1:'MST 1',mst2:'MST 2',mst3:'MST 3',endSemester:'End Semester'};

function fileLink(slot,label){
  const url=safeHttpsUrl(slot?.asset?.url);
  const type=slot?.asset?.mimeType==='application/pdf'?'PDF':'IMAGE';
  if(!url)return `<span class="timetable-file unavailable"><i>${type}</i><span><strong>${label}</strong><small>Not published</small></span><b>—</b></span>`;
  return `<a class="timetable-file" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><i>${type}</i><span><strong>${label}</strong><small>View official timetable</small></span><b>Open ↗</b></a>`;
}

function semesterMarkup(semester){
  const files=semester.timetableFiles||{};
  const count=Object.values(files).filter((slot)=>slot?.asset).length;
  return `<li class="semester-item"><details class="semester-group"><summary><span><strong>Semester ${roman[semester.number-1]}</strong><small>${count} timetable file${count===1?'':'s'} published</small></span><i aria-hidden="true"></i></summary><div class="timetable-groups"><section><h3>Class timetable</h3>${fileLink(files.classTable,slotLabels.classTable)}</section><section><h3>Exam timetable</h3><div class="exam-timetable-grid">${['mst1','mst2','mst3','endSemester'].map((slot)=>fileLink(files[slot],slotLabels[slot])).join('')}</div></section></div></details></li>`;
}

function render(){
  const container=document.querySelector('#programmeList');
  container.innerHTML=timetableProgrammes.map((programme,index)=>`<details class="programme" ${index===0?'open':''}><summary><span><small>${escapeHtml(programme.level)}</small><strong>${escapeHtml(programme.title)}</strong><em>${escapeHtml(programme.duration)}</em></span><i aria-hidden="true"></i></summary><div class="programme-content"><p>Choose a semester to view its class and examination timetables.</p><ol>${programme.semesters.map(semesterMarkup).join('')}</ol></div></details>`).join('');
  container.querySelectorAll('.programme').forEach((details)=>details.addEventListener('toggle',()=>{if(details.open)container.querySelectorAll('.programme').forEach((item)=>{if(item!==details)item.open=false})}));
}

async function load(){
  try{
    const documents=await academicDocumentService.listPublic('timetable');
    documents.forEach((document)=>{const programme=timetableProgrammes.find((item)=>item.id===document.programme);const semester=programme?.semesters.find((item)=>item.number===document.semester);if(semester)semester.timetableFiles=document.timetableFiles});
  }catch{/* The structured empty state remains usable while the API is offline. */}
  render();
}

load();
document.querySelector('#currentYear').textContent=new Date().getFullYear();
