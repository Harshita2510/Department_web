import { contentService } from '../services/content.service.js';
import { escapeHtml } from '../shared/dom.js';
import { API_BASE_URL } from '../config/api.js';
import { noticeFileUrl } from '../shared/notice-file.js';
import { bindResourceDocumentViewer } from '../components/resource-document-viewer.js';

const list=document.querySelector('#publicNoticeList');
const empty=document.querySelector('#noticeEmpty');
const search=document.querySelector('#noticeSearch');
let notices=[];

const documentIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.8h8l4 4V21H6z"></path><path d="M14 2.8V7h4M9 12h6M9 16h6"></path></svg>';
const eyeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>';
const downloadIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14"></path></svg>';

function dateParts(value){
  const date=value?new Date(value):new Date();
  return {day:String(date.getDate()).padStart(2,'0'),month:date.toLocaleDateString('en-IN',{month:'short'}),long:date.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})};
}

function noticeTime(item){return new Date(item.displayDate||item.publishedAt||item.createdAt||0).getTime()||0}

function render(){
  const term=search.value.trim().toLowerCase();
  const rows=notices.filter((item)=>!term||`${item.title} ${item.summary} ${item.body} ${item.category}`.toLowerCase().includes(term));
  list.innerHTML=rows.map((item)=>{
    const date=dateParts(item.displayDate||item.publishedAt||item.createdAt);
    const url=noticeFileUrl(item.asset?.url,API_BASE_URL);
    const title=escapeHtml(item.title);
    const summary=escapeHtml(item.summary||item.title);
    const body=String(item.body||item.title).trim();
    const hasExtraDetails=body&&body!==String(item.summary||item.title).trim();
    const attachment=url?`<span class="notice-actions"><button class="notice-action notice-view" type="button" data-resource-view data-url="${escapeHtml(url)}" data-title="${title}" data-mime-type="${escapeHtml(item.asset?.mimeType||'application/pdf')}" aria-label="View ${title}">${eyeIcon}<span>View</span></button><a class="notice-action notice-download" href="${escapeHtml(url)}" download="${escapeHtml(item.asset?.name||'notice')}" aria-label="Download ${title}" title="Download">${downloadIcon}</a></span>`:'';
    const details=hasExtraDetails?`<details class="notice-description"><summary>Read complete notice</summary><p>${escapeHtml(body)}</p></details>`:'';
    return `<article class="public-notice" id="notice-${escapeHtml(item._id)}"><div class="notice-row"><time class="notice-date"><strong>${date.day}</strong>${escapeHtml(date.month)}</time><span class="notice-file-icon" aria-hidden="true">${documentIcon}</span><span class="notice-copy"><small>${escapeHtml(date.long)}</small><h3>${title}</h3><p>${summary}</p></span>${attachment}</div>${details}</article>`;
  }).join('');
  empty.hidden=rows.length>0;
  const target=location.hash&&document.querySelector(location.hash);
  if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('notice-target')}
}

async function load(){
  try{notices=(await contentService.listPublic('notice')).sort((a,b)=>noticeTime(b)-noticeTime(a));render()}
  catch{empty.textContent='Notices could not be loaded. Please try again shortly.'}
}

bindResourceDocumentViewer(list);
search.addEventListener('input',render);
document.querySelector('#currentYear').textContent=new Date().getFullYear();
load();
