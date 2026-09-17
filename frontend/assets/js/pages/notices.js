import { contentService } from '../services/content.service.js';
import { escapeHtml } from '../shared/dom.js';

const list=document.querySelector('#publicNoticeList');
const empty=document.querySelector('#noticeEmpty');
const search=document.querySelector('#noticeSearch');
let notices=[];

function safeFileUrl(value){
  try{const url=new URL(value,location.href);return url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))?url.href:''}catch{return ''}
}
function dateParts(value){const date=value?new Date(value):new Date();return{day:String(date.getDate()).padStart(2,'0'),month:date.toLocaleDateString('en-IN',{month:'short'}),long:date.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}}
function render(){
  const term=search.value.trim().toLowerCase();
  const rows=notices.filter((item)=>!term||`${item.title} ${item.summary} ${item.body} ${item.category}`.toLowerCase().includes(term));
  list.innerHTML=rows.map((item)=>{const date=dateParts(item.displayDate||item.publishedAt);const url=safeFileUrl(item.asset?.url);return `<details class="public-notice" id="notice-${item._id}"><summary><time class="notice-date"><strong>${date.day}</strong>${escapeHtml(date.month)}</time><span><small>${escapeHtml(item.category||'General')} · ${escapeHtml(date.long)}</small><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary||'')}</p></span><b class="notice-toggle">+</b></summary><div class="notice-details"><p>${escapeHtml(item.body||'')}</p>${url?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open official PDF ↗</a>`:''}</div></details>`}).join('');
  empty.hidden=rows.length>0;
  const target=location.hash&&document.querySelector(location.hash);if(target){target.open=true;target.scrollIntoView({behavior:'smooth'})}
}
async function load(){try{notices=await contentService.listPublic('notice');render()}catch{empty.textContent='Notices could not be loaded. Please try again shortly.'}}
search.addEventListener('input',render);document.querySelector('#currentYear').textContent=new Date().getFullYear();load();
