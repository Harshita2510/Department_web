import { escapeHtml } from './shared/dom.js';
import { contentService } from './services/content.service.js';
import { uploadService } from './services/upload.service.js';
import { authService } from './services/auth.service.js';

const nav=document.querySelector('#noticeWorkspaceNav');
const panel=document.querySelector('#noticeWorkspacePanel');
const form=document.querySelector('#facultyNoticeForm');
const list=document.querySelector('#facultyNoticeList');
const empty=document.querySelector('#facultyNoticeEmpty');
const feedback=document.querySelector('#facultyNoticeFeedback');
form.addEventListener('submit',saveNotice);
list.addEventListener('click',deleteNotice);

async function initialise(){
  try{
    const current=await authService.me();
    const allowed=current.permissions?.includes('notice_upload');
    nav.hidden=!allowed;panel.hidden=!allowed;
    if(allowed)await loadNotices();
  }catch{/* The main faculty portal handles expired sessions. */}
}

function message(text,error=false){
  feedback.textContent=text;
  feedback.classList.toggle('error',error);
}

function render(items){
  list.innerHTML=items.map((item)=>`<article class="faculty-notice-item">
    <div><small>${escapeHtml(item.category||'General')} · ${item.displayDate?new Date(item.displayDate).toLocaleDateString('en-IN'):'No date'}</small><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary||'')}</p></div>
    <div><span class="notice-draft-status">${escapeHtml(item.status)}</span>${item.asset?.url?`<a href="${escapeHtml(item.asset.url)}" target="_blank" rel="noopener noreferrer">Open PDF ↗</a>`:''}<button type="button" data-delete-notice="${item._id}">Delete draft</button></div>
  </article>`).join('');
  empty.hidden=items.length>0;
}

async function loadNotices(){
  try{render(await contentService.listManaged('notice'))}
  catch(error){message(error.message,true)}
}

async function saveNotice(event){
  event.preventDefault();
  if(!form.reportValidity())return;
  const file=document.querySelector('#facultyNoticePdf').files[0];
  if(file.type!=='application/pdf'){message('Choose a PDF document.',true);return}
  if(file.size>10*1024*1024){message('The notice PDF must be 10 MB or smaller.',true);return}
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;button.textContent='Uploading…';message('');
  try{
    const asset=await uploadService.uploadNoticePdf(file);
    await contentService.create({type:'notice',title:document.querySelector('#facultyNoticeTitle').value.trim(),category:document.querySelector('#facultyNoticeCategory').value,summary:document.querySelector('#facultyNoticeShort').value.trim(),body:document.querySelector('#facultyNoticeLong').value.trim(),displayDate:document.querySelector('#facultyNoticeDate').value||undefined,asset,status:'draft'});
    form.reset();message('Notice draft submitted. The administrator must review and publish it.');await loadNotices();
  }catch(error){message(error.message,true)}
  finally{button.disabled=false;button.textContent='Submit notice draft'}
}

async function deleteNotice(event){
  const button=event.target.closest('[data-delete-notice]');
  if(!button||!confirm('Delete this unpublished notice draft?'))return;
  try{await contentService.remove(button.dataset.deleteNotice);message('Draft deleted.');await loadNotices()}
  catch(error){message(error.message,true)}
}
initialise();
