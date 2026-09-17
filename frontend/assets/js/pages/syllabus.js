import { syllabusProgrammes } from '../data/syllabus.data.js';
import { renderProgrammeDocuments } from '../components/programme-document-accordion.js';
import { academicSubjectService } from '../services/academic-subject.service.js';

async function load(){
  try{const subjects=await academicSubjectService.listPublic();subjects.forEach((subject)=>{const programme=syllabusProgrammes.find((item)=>item.id===subject.programme);const semester=programme?.semesters.find((item)=>item.number===subject.semester);if(semester)semester.subjects.push(subject)})}catch{/* Empty subject lists remain visible when the API is offline. */}
  renderProgrammeDocuments({ container:document.querySelector('#programmeList'), programmes:syllabusProgrammes, documentName:'syllabus', notice:document.querySelector('#syllabusNotice') });
}
load();

document.querySelector('#currentYear').textContent = new Date().getFullYear();
