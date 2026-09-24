import { contentService } from '../services/content.service.js';
import { escapeHtml } from '../shared/dom.js';

const list=document.querySelector('#publicEventList');
const empty=document.querySelector('#eventEmpty');
const search=document.querySelector('#eventSearch');
const category=document.querySelector('#eventCategory');
const result=document.querySelector('#eventResult');
let events=[];

function safeAssetUrl(value){
  try{const url=new URL(value,location.href);return url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))?url.href:''}catch{return ''}
}
function eventDate(value){
  const date=value?new Date(value):null;
  if(!date||Number.isNaN(date.getTime()))return{day:'—',month:'Date',year:'TBA',long:'Date to be announced',sort:0};
  return{day:String(date.getDate()).padStart(2,'0'),month:date.toLocaleDateString('en-IN',{month:'short'}),year:String(date.getFullYear()),long:date.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}),sort:date.getTime()};
}
function openHashTarget(){
  if(!location.hash)return;
  const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if(target){target.open=true;requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'start'}))}
}
function render(){
  const term=search.value.trim().toLowerCase();
  const selected=category.value;
  const rows=events.filter((item)=>(selected==='all'||item.category===selected)&&(!term||`${item.title} ${item.summary||''} ${item.body||''} ${item.category||''}`.toLowerCase().includes(term)));
  list.innerHTML=rows.map((item)=>{
    const date=eventDate(item.displayDate||item.publishedAt);
    const assetUrl=safeAssetUrl(item.asset?.url);
    const isImage=item.asset?.mimeType?.startsWith('image/');
    const assetLabel=item.asset?.mimeType==='application/pdf'?'Open event document':'Open full image';
    return `<details class="public-event" id="event-${escapeHtml(item._id)}">${isImage&&assetUrl?`<div class="event-image"><img src="${escapeHtml(assetUrl)}" alt="${escapeHtml(item.title)}" loading="lazy"></div>`:''}<summary><time class="event-date" datetime="${escapeHtml(item.displayDate||'')}"><strong>${date.day}</strong>${escapeHtml(date.month)}<br>${escapeHtml(date.year)}</time><span class="event-copy"><small>${escapeHtml(item.category||'Department event')} · ${escapeHtml(date.long)}</small><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary||'Open to read event details.')}</p></span><b class="event-toggle" aria-hidden="true">+</b></summary><div class="event-details"><p>${escapeHtml(item.body||item.summary||'Further details will be announced by the department.')}</p>${assetUrl?`<a href="${escapeHtml(assetUrl)}" target="_blank" rel="noopener noreferrer">${assetLabel} ↗</a>`:''}</div></details>`;
  }).join('');
  empty.hidden=rows.length>0;
  result.textContent=`Showing ${rows.length} published event${rows.length===1?'':'s'}.`;
  openHashTarget();
}
async function load(){
  try{
    events=await contentService.listPublic('event');
    events.sort((left,right)=>eventDate(right.displayDate||right.publishedAt).sort-eventDate(left.displayDate||left.publishedAt).sort);
    const categories=[...new Set(events.map((item)=>item.category).filter(Boolean))].sort();
    category.insertAdjacentHTML('beforeend',categories.map((value)=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join(''));
    render();
  }catch(error){empty.hidden=false;empty.textContent='Events could not be loaded. Please try again shortly.';result.textContent=error.message||'Unable to load events.'}
}
search.addEventListener('input',render);category.addEventListener('change',render);
document.querySelector('#currentYear').textContent=new Date().getFullYear();
load();
