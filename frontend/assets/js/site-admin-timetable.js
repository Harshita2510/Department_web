import { escapeHtml } from './shared/dom.js';
import { academicDocumentService } from './services/academic-document.service.js';
import { facultyService } from './services/faculty.service.js';

const $=(selector)=>document.querySelector(selector);
const slots={classTable:'Class timetable',quiz:'Quiz timetable',mst1:'MST 1',mst2:'MST 2',mst3:'MST 3',endSemester:'End Semester'};
let records=[];
let faculty=[];
let uploadTarget=null;
let toastTimer;

function notify(message){
  const toast=$('#cmsToast');
  toast.textContent=message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('show'),3600);
}

function semesterOptions(programme,selected=1){
  return Array.from({length:programme==='pg-cse'?4:8},(_,index)=>`<option value="${index+1}" ${index+1===Number(selected)?'selected':''}>Semester ${index+1}</option>`).join('');
}

function editorIds(record){
  return (record?.editors||[]).map((editor)=>typeof editor==='string'?editor:editor._id);
}

function renderFacultyOptions(selected=[]){
  const chosen=new Set(selected);
  $('#timetableFacultyOptions').innerHTML=faculty.length
    ?faculty.map((item)=>`<label><input type="checkbox" value="${escapeHtml(item.userId)}" ${chosen.has(item.userId)?'checked':''}><span>${escapeHtml(item.fullName||item.facultyId)}<small>${escapeHtml([item.facultyId,item.designation].filter(Boolean).join(' · '))}</small></span></label>`).join('')
    :'<p>No active faculty accounts available.</p>';
}

function slotMarkup(record,slot,label){
  const file=record.timetableFiles?.[slot];
  const state=file?.status||'missing';
  return `<section class="timetable-slot">
    <span>${label}</span>
    <small>${file?.asset?escapeHtml(file.asset.name):'PDF or image not uploaded'}</small>
    <b class="timetable-slot-state ${state==='published'?'published':''}">${escapeHtml(state.replace('_',' '))}</b>
    <div class="timetable-slot-actions">
      <button data-timetable-upload="${record._id}" data-slot="${slot}">${file?.asset?'Replace':'Upload'}</button>
      ${file?.asset&&state!=='published'?`<button class="publish" data-timetable-publish="${record._id}" data-slot="${slot}">Publish</button>`:''}
      ${file?.asset?`<button class="danger-link delete-file" data-timetable-file-delete="${record._id}" data-slot="${slot}" data-label="${escapeHtml(label)}">Delete file</button>`:''}
    </div>
  </section>`;
}

function render(){
  $('#timetableRecordCount').textContent=records.length;
  $('#timetableAdminEmpty').classList.toggle('show',!records.length);
  $('#timetableAdminList').innerHTML=records.map((record)=>`<article class="timetable-admin-card">
    <header class="timetable-admin-head">
      <div><h3>${record.programme==='ug-cse'?'B.Tech CSE':'M.Tech CSE'} · Semester ${record.semester}</h3><p>${escapeHtml(record.academicYear||'Current')} · ${escapeHtml(record.term||'semester')} · ${(record.editors||[]).length} faculty uploader${(record.editors||[]).length===1?'':'s'}</p></div>
      <div><button data-timetable-edit="${record._id}">Edit access</button><button class="delete-timetable" data-timetable-delete="${record._id}">Delete semester</button></div>
    </header>
    <div class="timetable-slots">${Object.entries(slots).map(([slot,label])=>slotMarkup(record,slot,label)).join('')}</div>
  </article>`).join('');
}

async function reload(){
  records=await academicDocumentService.listAdmin('timetable');
  render();
}

async function openModal(record=null){
  $('#timetableForm').reset();
  $('#timetableId').value=record?._id||'';
  $('#timetableModalTitle').textContent=record?'Edit semester':'Add semester';
  $('#timetableProgramme').value=record?.programme||'ug-cse';
  $('#timetableSemester').innerHTML=semesterOptions($('#timetableProgramme').value,record?.semester||1);
  $('#timetableYear').value=record?.academicYear||'';
  $('#timetableTerm').value=record?.term||'odd';
  $('#timetableTitle').value=record?.title||'Semester timetable';
  try{faculty=await facultyService.listAccessOptions()}catch(error){notify(error.message)}
  renderFacultyOptions(editorIds(record));
  $('#timetableModal').classList.add('open');
  $('#timetableModal').setAttribute('aria-hidden','false');
}

function closeModal(){
  $('#timetableModal').classList.remove('open');
  $('#timetableModal').setAttribute('aria-hidden','true');
}

$('#addTimetableRecord').addEventListener('click',()=>openModal());
$('#timetableProgramme').addEventListener('change',()=>{$('#timetableSemester').innerHTML=semesterOptions($('#timetableProgramme').value)});
document.querySelectorAll('[data-close-timetable]').forEach((node)=>node.addEventListener('click',closeModal));

$('#timetableForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const id=$('#timetableId').value;
  const academicYear=$('#timetableYear').value.trim();
  const yearMatch=academicYear.match(/^(\d{4})-(\d{2})$/);
  const startsIn=yearMatch?Number(yearMatch[1]):0;
  const endsIn=yearMatch?Number(yearMatch[2]):0;
  if(!yearMatch||endsIn!==(startsIn+1)%100){
    notify('Enter a consecutive academic year, for example 2026-27.');
    $('#timetableYear').focus();
    return;
  }
  const payload={
    resourceType:'timetable',programme:$('#timetableProgramme').value,
    semester:Number($('#timetableSemester').value),academicYear,
    term:$('#timetableTerm').value,title:$('#timetableTitle').value.trim(),documentUrl:'',
    editors:[...$('#timetableFacultyOptions').querySelectorAll('input:checked')].map((input)=>input.value),
    status:'draft',isCurrent:true
  };
  try{
    if(id)await academicDocumentService.update(id,payload);else await academicDocumentService.create(payload);
    closeModal();await reload();notify(id?'Timetable access updated.':'Semester timetable created.');
  }catch(error){notify(error.message)}
});

$('#timetableAdminList').addEventListener('click',async(event)=>{
  const upload=event.target.closest('[data-timetable-upload]');
  if(upload){
    uploadTarget={id:upload.dataset.timetableUpload,slot:upload.dataset.slot};
    $('#timetableUploadInput').click();
    return;
  }
  const publish=event.target.closest('[data-timetable-publish]');
  if(publish){
    try{await academicDocumentService.publishTimetable(publish.dataset.timetablePublish,publish.dataset.slot);await reload();notify('Timetable published.')}catch(error){notify(error.message)}
    return;
  }
  const fileDelete=event.target.closest('[data-timetable-file-delete]');
  if(fileDelete){
    const wasPublished=Boolean(fileDelete.closest('.timetable-slot').querySelector('.timetable-slot-state.published'));
    if(!confirm(`Delete the ${fileDelete.dataset.label} file?${wasPublished?' It will stop being visible publicly.':''}`))return;
    try{await academicDocumentService.deleteTimetable(fileDelete.dataset.timetableFileDelete,fileDelete.dataset.slot);await reload();notify(`${fileDelete.dataset.label} deleted.`)}catch(error){notify(error.message)}
    return;
  }
  const edit=event.target.closest('[data-timetable-edit]');
  if(edit){openModal(records.find((record)=>record._id===edit.dataset.timetableEdit));return}
  const remove=event.target.closest('[data-timetable-delete]');
  if(remove&&confirm('Delete this semester and all uploaded timetables?')){
    try{await academicDocumentService.remove(remove.dataset.timetableDelete);await reload();notify('Timetable semester deleted.')}catch(error){notify(error.message)}
  }
});

$('#timetableUploadInput').addEventListener('change',async(event)=>{
  const file=event.target.files[0];event.target.value='';
  if(!file||!uploadTarget)return;
  if(file.size>10*1024*1024){notify('Timetable files must be 10 MB or smaller.');return}
  if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)){notify('Choose a PDF, JPG, PNG or WebP file.');return}
  try{notify('Uploading timetable…');await academicDocumentService.uploadTimetable(uploadTarget.id,uploadTarget.slot,file);await reload();notify('Timetable uploaded as a draft. Publish it when ready.')}catch(error){notify(error.message)}
});

reload().catch((error)=>notify(error.message));
