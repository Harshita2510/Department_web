import { contentService } from '../services/content.service.js';
import { API_BASE_URL } from '../config/api.js';
import { escapeHtml } from '../shared/dom.js';

function safeUrl(value){
  try{
    const url=new URL(value,location.href);const apiUrl=new URL(API_BASE_URL,location.href);
    // Repair records uploaded while API_PUBLIC_URL was set to a service origin
    // without the required /api path. This also keeps old published records usable.
    if(url.origin===apiUrl.origin&&/^\/files\/[a-f\d]{24}$/i.test(url.pathname)&&/\/api$/i.test(apiUrl.pathname))url.pathname=`${apiUrl.pathname}${url.pathname}`;
    return url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))?url.href:'';
  }catch{return '';}
}
function empty(message){return `<article class="file-card"><span class="file-meta">RESEARCH RECORDS</span><h3>No published records yet</h3><p>${escapeHtml(message)}</p></article>`;}
function fileCard(item,index){
  const url=safeUrl(item.asset?.url);
  const content=`<span class="file-meta">${escapeHtml(item.category)} / ${String(index+1).padStart(2,'0')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary||item.body||'Open this research record for details.')}</p><span class="file-action">${url?'VIEW DOCUMENT ↗':'RESEARCH RECORD'}</span>`;
  return url?`<a class="file-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${content}</a>`:`<article class="file-card">${content}</article>`;
}
function focusCard(item,index){
  const url=safeUrl(item.asset?.url);
  const content=`<span class="research-card-number">R / ${String(index+1).padStart(2,'0')}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary||item.body||'Research focus area')}</p><span class="research-card-arrow" aria-hidden="true">${url?'VIEW DOCUMENT ↗':'→'}</span>`;
  return url?`<a class="research-focus-card" data-dynamic-research-record="true" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open document: ${escapeHtml(item.title)}">${content}</a>`:`<article class="research-focus-card" data-dynamic-research-record="true">${content}</article>`;
}
function topicCards(items,label){
  const cards=items.length?items.map((item,index)=>{
    const url=safeUrl(item.asset?.url);const content=`<span>${String(index+1).padStart(2,'0')} / ${escapeHtml(item.category).toUpperCase()}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary||item.body||'Research record')}</p>`;
    return url?`<a class="topic-box" data-dynamic-research-record="true" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open document: ${escapeHtml(item.title)}">${content}</a>`:`<article class="topic-box" data-dynamic-research-record="true">${content}</article>`;
  }).join(''):`<article class="topic-box"><span>RESEARCH RECORDS</span><h2>No published records yet</h2><p>The administrator has not published a record in this section yet.</p></article>`;
  return `<span class="research-eyebrow" style="color:#a48135;">${escapeHtml(label)}</span><div class="topic-grid">${cards}</div>`;
}
function facilityCard(item){
  const url=safeUrl(item.asset?.url);
  const isImage=Boolean(url&&item.asset?.mimeType?.startsWith('image/'));
  const asset=isImage?`<img src="${escapeHtml(url)}" alt="${escapeHtml(item.title)}" loading="lazy">`:`<div class="facility-record-placeholder" aria-hidden="true">${escapeHtml(item.category||'FACILITY').slice(0,1)}</div>`;
  const action=url?`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${isImage?'View image':'Open attachment'} <span>↗</span></a>`:'';
  return `<article class="facility-record">${asset}<div><span>${escapeHtml(item.category||'Department facility')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary||item.body||'Department facility information.')}</p>${action}</div></article>`;
}
function renderFacilities(items){
  const target=document.querySelector('.research-facilities-inner');
  if(!target)return;
  const cards=items.length?items.map(facilityCard).join(''):`<article class="facility-record facility-record-empty"><div><span>DEPARTMENT FACILITIES</span><h3>No facilities published yet</h3><p>Laboratories, classrooms, equipment and project spaces will appear here once published by the administrator.</p></div></article>`;
  target.innerHTML=`<div class="facilities-copy-block"><p class="facilities-kicker">Department facilities</p><h2>Spaces to learn.<em>Room to build.</em></h2><p class="facilities-copy">Explore the laboratories, learning spaces, equipment and resources available to Computer Engineering students.</p></div><div class="facility-record-grid">${cards}</div>`;
}
async function load(){
  try{
    const page=location.pathname.split('/').pop();
    const [records,facilities]=await Promise.all([contentService.listPublic('document'),page==='research.html'?contentService.listPublic('media'):Promise.resolve([])]);
    const researchAreas=records.filter((item)=>item.category==='Research area');
    const publications=records.filter((item)=>item.category==='Publication');
    const projects=records.filter((item)=>item.category==='Patent & project');
    const laboratories=records.filter((item)=>item.category==='Laboratory');
    if(page==='research.html'){const target=document.querySelector('.research-focus');if(target)target.innerHTML=researchAreas.length?researchAreas.map(focusCard).join(''):`<article class="research-focus-card"><span class="research-card-number">RESEARCH RECORDS</span><h2>No published research areas yet</h2><p>Research areas will appear here after the administrator publishes them.</p></article>`;renderFacilities(facilities);}
    if(page==='research-areas.html'){const target=document.querySelector('.topic-content');if(target)target.innerHTML=topicCards(researchAreas,'Department research areas');}
    if(page==='publications.html'){const target=document.querySelector('.file-grid');if(target)target.innerHTML=publications.length?publications.map(fileCard).join(''):empty('Published publications and papers will appear here.');}
    if(page==='projects-patents.html'){const target=document.querySelector('.file-grid');if(target)target.innerHTML=projects.length?projects.map(fileCard).join(''):empty('Published patents and projects will appear here.');}
    if(page==='laboratories.html'){const target=document.querySelector('.topic-content');if(target)target.innerHTML=topicCards(laboratories,'Department laboratories');}
  }catch{/* Keep the page usable if the public API is temporarily unavailable. */}
}
load();
