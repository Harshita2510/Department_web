import { escapeHtml } from './shared/dom.js';
import { questionPaperService } from './services/question-paper.service.js';

const $=(selector)=>document.querySelector(selector);let records=[];let timer;
function notify(message){const toast=$('#cmsToast');toast.textContent=message;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),3600)}
function semesterOptions(programme,selected=1){return Array.from({length:programme==='pg-cse'?4:8},(_,index)=>`<option value="${index+1}" ${index+1===Number(selected)?'selected':''}>Semester ${index+1}</option>`).join('')}
function render(){
  $('#questionPaperCount').textContent=records.length;$('#questionPaperAdminEmpty').classList.toggle('show',!records.length);
  $('#questionPaperAdminList').innerHTML=records.map((item)=>`<article class="question-paper-admin-card"><div><span>${item.programme==='ug-cse'?'B.Tech':'M.Tech'} · Semester ${item.semester} · ${item.examType==='mid-sem'?'Mid-Sem':'End-Sem'}</span><h3>${escapeHtml(item.subjectCode?`${item.subjectCode} — ${item.subjectName}`:item.subjectName)}</h3><p>${escapeHtml(item.academicYear)} · ${item.asset?escapeHtml(item.asset.name):'PDF not uploaded'}</p></div><b class="question-paper-state ${item.status==='published'?'published':''}">${escapeHtml(item.status)}</b><div class="question-paper-actions">${item.asset?`<a href="${escapeHtml(item.asset.url)}" target="_blank" rel="noopener noreferrer">View PDF</a>`:''}<button type="button" data-paper-edit="${item._id}">Edit</button>${item.asset&&item.status!=='published'?`<button class="publish" type="button" data-paper-publish="${item._id}">Publish</button>`:''}<button class="danger-link" type="button" data-paper-delete="${item._id}">Delete</button></div></article>`).join('');
}
async function reload(){records=await questionPaperService.listAdmin();render()}
function openModal(item=null){
  $('#questionPaperForm').reset();$('#questionPaperId').value=item?._id||'';$('#questionPaperModalTitle').textContent=item?'Edit question paper':'Add question paper';
  $('#questionPaperProgramme').value=item?.programme||'ug-cse';$('#questionPaperSemester').innerHTML=semesterOptions($('#questionPaperProgramme').value,item?.semester||1);
  $('#questionPaperCode').value=item?.subjectCode||'';$('#questionPaperSubject').value=item?.subjectName||'';$('#questionPaperExamType').value=item?.examType||'mid-sem';$('#questionPaperYear').value=item?.academicYear||'';
  $('#questionPaperExisting').textContent=item?.asset?`Current PDF: ${item.asset.name}`:'PDF required before publication';$('#questionPaperPublish').checked=item?.status==='published';
  $('#questionPaperModal').classList.add('open');$('#questionPaperModal').setAttribute('aria-hidden','false');
}
function closeModal(){$('#questionPaperModal').classList.remove('open');$('#questionPaperModal').setAttribute('aria-hidden','true')}
$('#addQuestionPaper').addEventListener('click',()=>openModal());$('#questionPaperEmptyAdd').addEventListener('click',()=>openModal());
$('#questionPaperProgramme').addEventListener('change',()=>{$('#questionPaperSemester').innerHTML=semesterOptions($('#questionPaperProgramme').value)});
document.querySelectorAll('[data-close-question-paper]').forEach((node)=>node.addEventListener('click',closeModal));
$('#questionPaperForm').addEventListener('submit',async(event)=>{
  event.preventDefault();const id=$('#questionPaperId').value;const file=$('#questionPaperPdf').files[0];
  if(file&&(file.type!=='application/pdf'||file.size>10*1024*1024)){notify('Choose a PDF no larger than 10 MB.');return}
  const payload={programme:$('#questionPaperProgramme').value,semester:Number($('#questionPaperSemester').value),subjectCode:$('#questionPaperCode').value.trim(),subjectName:$('#questionPaperSubject').value.trim(),examType:$('#questionPaperExamType').value,academicYear:$('#questionPaperYear').value.trim()};
  try{
    let item=id?await questionPaperService.update(id,payload):await questionPaperService.create(payload);
    if(file)item=await questionPaperService.upload(item._id,file);
    if($('#questionPaperPublish').checked)item=await questionPaperService.update(item._id,{status:'published'});
    closeModal();await reload();notify('Question paper saved.');
  }catch(error){notify(error.message)}
});
$('#questionPaperAdminList').addEventListener('click',async(event)=>{
  const edit=event.target.closest('[data-paper-edit]');if(edit){openModal(records.find((item)=>item._id===edit.dataset.paperEdit));return}
  const publish=event.target.closest('[data-paper-publish]');if(publish){try{await questionPaperService.update(publish.dataset.paperPublish,{status:'published'});await reload();notify('Question paper published.')}catch(error){notify(error.message)}return}
  const remove=event.target.closest('[data-paper-delete]');if(remove&&confirm('Delete this question paper and its Cloudinary PDF?')){try{await questionPaperService.remove(remove.dataset.paperDelete);await reload();notify('Question paper deleted.')}catch(error){notify(error.message)}}
});
reload().catch((error)=>notify(error.message));
