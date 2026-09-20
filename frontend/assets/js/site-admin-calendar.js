import { escapeHtml } from './shared/dom.js';
import { academicDocumentService } from './services/academic-document.service.js';
import { uploadService } from './services/upload.service.js';

const list=document.querySelector('#calendarAdminList');
const empty=document.querySelector('#calendarAdminEmpty');
const count=document.querySelector('#calendarRecordCount');
const modal=document.querySelector('#calendarModal');
const form=document.querySelector('#calendarForm');
let records=[];

function toast(message){const node=document.querySelector('#cmsToast');node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),3600)}
function termLabel(term){return term==='odd'?'Odd semester':term==='even'?'Even semester':'Annual'}
function render(){
  count.textContent=records.length;
  list.innerHTML=records.map((item)=>`<article class="calendar-admin-card"><div><span>${item.isCurrent?'Current calendar':'Archive'} · ${escapeHtml(item.status)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.academicYear||'')} · ${termLabel(item.term)}</p></div><div class="calendar-admin-actions"><a href="${escapeHtml(item.documentUrl)}" target="_blank" rel="noopener noreferrer">Open PDF ↗</a><button type="button" data-edit-calendar="${item._id}">Edit / replace</button><button class="danger-link" type="button" data-delete-calendar="${item._id}">Delete</button></div></article>`).join('');
  empty.classList.toggle('show',records.length===0);
}
async function load(){try{records=await academicDocumentService.listAdmin('academic-calendar');render()}catch(error){toast(error.message)}}
function open(id=''){
  const item=records.find((record)=>record._id===id);form.reset();
  document.querySelector('#calendarId').value=item?._id||'';
  document.querySelector('#calendarModalTitle').textContent=item?'Edit academic calendar':'Upload academic calendar';
  document.querySelector('#calendarTitle').value=item?.title||'Academic calendar';
  document.querySelector('#calendarYear').value=item?.academicYear||'';
  document.querySelector('#calendarTerm').value=item?.term||'odd';
  document.querySelector('#calendarCurrent').checked=item?.isCurrent??true;
  document.querySelector('#calendarPublished').checked=item?.status==='published';
  document.querySelector('#calendarPdf').required=!item;
  document.querySelector('#calendarExisting').textContent=item?.documentUrl?'A PDF is already stored. Choose a file only to replace it.':'PDF only · Maximum 10 MB';
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('no-scroll');
}
function close(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('no-scroll')}
async function save(event){
  event.preventDefault();if(!form.reportValidity())return;
  const id=document.querySelector('#calendarId').value;const existing=records.find((item)=>item._id===id);const year=document.querySelector('#calendarYear').value.trim();
  const [start,end]=year.split('-').map(Number);if(!/^\d{4}-\d{2}$/.test(year)||end!==(start+1)%100){toast('Enter consecutive years such as 2026-27.');return}
  const file=document.querySelector('#calendarPdf').files[0];if(file&&(file.type!=='application/pdf'||file.size>10*1024*1024)){toast('Choose a PDF of 10 MB or less.');return}
  const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Saving…';
  try{
    let documentUrl=existing?.documentUrl||'';if(file){const asset=await uploadService.upload(file);documentUrl=asset.url}
    const payload={resourceType:'academic-calendar',programme:'institute-wide',semester:null,academicYear:year,term:document.querySelector('#calendarTerm').value,title:document.querySelector('#calendarTitle').value.trim(),documentUrl,isCurrent:document.querySelector('#calendarCurrent').checked,status:document.querySelector('#calendarPublished').checked?'published':'draft'};
    if(id)await academicDocumentService.update(id,payload);else await academicDocumentService.create(payload);
    close();toast('Academic calendar saved.');await load();
  }catch(error){toast(error.message)}finally{button.disabled=false;button.textContent='Save calendar'}
}
document.querySelector('#addCalendarRecord').addEventListener('click',()=>open());
document.querySelector('#calendarEmptyAdd').addEventListener('click',()=>open());
document.querySelectorAll('[data-close-calendar]').forEach((button)=>button.addEventListener('click',close));
list.addEventListener('click',async(event)=>{const edit=event.target.closest('[data-edit-calendar]');if(edit)open(edit.dataset.editCalendar);const remove=event.target.closest('[data-delete-calendar]');if(remove&&confirm('Delete this academic calendar record?')){try{await academicDocumentService.remove(remove.dataset.deleteCalendar);toast('Academic calendar deleted.');await load()}catch(error){toast(error.message)}}});
form.addEventListener('submit',save);document.addEventListener('keydown',(event)=>{if(event.key==='Escape')close()});load();
