import { contentService } from '../services/content.service.js';
import { API_BASE_URL } from '../config/api.js';
import { escapeHtml } from '../shared/dom.js';
import { bindResourceDocumentViewer } from '../components/resource-document-viewer.js';

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
function documentActions(item,label,url){
  if(!url)return '';
  const safeLabel=escapeHtml(label);const safeUrlValue=escapeHtml(url);const mimeType=escapeHtml(item.asset?.mimeType||'application/pdf');
  return `<span class="research-document-actions"><button type="button" data-resource-view data-url="${safeUrlValue}" data-title="${safeLabel}" data-mime-type="${mimeType}">View</button><a href="${safeUrlValue}" download="${escapeHtml(item.asset?.name||label)}">Download</a></span>`;
}
function fileCard(item,index){
  const url=safeUrl(item.asset?.url);
  const content=`<span class="file-meta">${escapeHtml(item.category)} / ${String(index+1).padStart(2,'0')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary||item.body||'Open this research record for details.')}</p>${documentActions(item,item.title,url)}`;
  return `<article class="file-card">${content}</article>`;
}
function focusCard(item,index){
  const url=safeUrl(item.asset?.url);
  const content=`<span class="research-card-number">R / ${String(index+1).padStart(2,'0')}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary||item.body||'Research focus area')}</p>${documentActions(item,item.title,url)}`;
  return `<article class="research-focus-card" data-dynamic-research-record="true">${content}</article>`;
}
function topicCards(items,label){
  const cards=items.length?items.map((item,index)=>{
    const url=safeUrl(item.asset?.url);const content=`<span>${String(index+1).padStart(2,'0')} / ${escapeHtml(item.category).toUpperCase()}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary||item.body||'Research record')}</p>${documentActions(item,item.title,url)}`;
    return `<article class="topic-box" data-dynamic-research-record="true">${content}</article>`;
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
function installResearchDocumentStyles(){
  if(document.querySelector('#research-document-actions'))return;
  document.head.insertAdjacentHTML('beforeend','<style id="research-document-actions">.research-document-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:22px}.research-document-actions button,.research-document-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 14px;border:1px solid currentColor;color:inherit;background:transparent;font:700 .72rem/1 Manrope,Arial,sans-serif;letter-spacing:.04em;text-decoration:none;cursor:pointer}.research-document-actions button{background:#eaae35;border-color:#eaae35;color:#071b34}.research-document-actions a:hover,.research-document-actions a:focus-visible{color:#eaae35}.resource-viewer[hidden]{display:none}.resource-viewer{position:fixed;z-index:1000;inset:0;display:grid;place-items:center;padding:28px;background:rgba(7,27,52,.72);backdrop-filter:blur(4px)}.resource-viewer-window{width:min(1180px,100%);height:min(830px,calc(100vh - 56px));display:grid;grid-template-rows:auto 1fr auto;overflow:hidden;background:#fff;border:1px solid #b9c7d6;border-radius:12px;box-shadow:0 24px 70px rgba(2,13,28,.32)}.resource-viewer-window>header{min-height:66px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 22px;color:#fff;background:#0a294d}.resource-viewer-window>header>strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 16px Manrope,Arial,sans-serif}.resource-viewer-window>header>div{display:flex;align-items:center;gap:8px}.resource-viewer-window>header>div>span{width:1px;height:28px;margin:0 6px;background:rgba(255,255,255,.25)}.resource-viewer-icon{width:39px;height:39px;display:grid;place-items:center;padding:0;color:#dce7f3;background:transparent;border:0;border-radius:8px;cursor:pointer}.resource-viewer-icon:hover,.resource-viewer-icon:focus-visible{color:#fff;background:rgba(255,255,255,.12);outline:none}.resource-viewer-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.resource-viewer-content{min-height:0;display:grid;place-items:center;overflow:auto;background:#8d9298}.resource-viewer-content iframe{width:100%;height:100%;border:0;background:#fff}.resource-viewer-content img{display:block;max-width:100%;max-height:100%;object-fit:contain;background:#fff}.resource-viewer-window>footer{min-height:43px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 22px;color:#62758f;background:#eef3f8;font:600 12px Manrope,Arial,sans-serif}.resource-viewer-download-text{color:#9a7417;font-weight:800}body.resource-viewer-open{overflow:hidden}@media(max-width:600px){.resource-viewer{padding:12px}.resource-viewer-window{height:calc(100vh - 24px)}.resource-viewer-window>header{padding:0 12px}.resource-viewer-window>footer{padding:0 14px}.resource-viewer-window>footer span{display:none}}</style>');
}
installResearchDocumentStyles();
bindResourceDocumentViewer(document.querySelector('main'));
load();
