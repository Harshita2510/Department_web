import { timetableProgrammes } from '../data/timetable.data.js';
import { renderProgrammeDocuments } from '../components/programme-document-accordion.js';
import { academicDocumentService } from '../services/academic-document.service.js';

async function load(){
  try{const documents=await academicDocumentService.listPublic('timetable');documents.forEach((document)=>{const programme=timetableProgrammes.find((item)=>item.id===document.programme);const semester=programme?.semesters.find((item)=>item.number===document.semester);if(semester)semester.documentUrl=document.documentUrl})}catch{/* Static empty-state data remains visible when the API is offline. */}
  renderProgrammeDocuments({ container:document.querySelector('#programmeList'), programmes:timetableProgrammes, documentName:'timetable', notice:document.querySelector('#resourceNotice') });
}
load();
document.querySelector('#currentYear').textContent = new Date().getFullYear();
