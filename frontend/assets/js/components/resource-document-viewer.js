import { safeHttpsUrl } from '../shared/security.js';

const externalIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"></path><path d="M18 13v6H5V6h6"></path></svg>';
const downloadIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14"></path></svg>';
const closeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>';

function viewerMarkup(){
  return `<div class="resource-viewer" hidden role="dialog" aria-modal="true" aria-labelledby="resourceViewerTitle"><div class="resource-viewer-window"><header><strong id="resourceViewerTitle"></strong><div><a class="resource-viewer-icon resource-viewer-external" target="_blank" rel="noopener noreferrer" aria-label="Open document in a new tab" title="Open in new tab">${externalIcon}</a><a class="resource-viewer-icon resource-viewer-download" download aria-label="Download document" title="Download">${downloadIcon}</a><span aria-hidden="true"></span><button class="resource-viewer-icon resource-viewer-close" type="button" aria-label="Close preview">${closeIcon}</button></div></header><div class="resource-viewer-content"></div><footer><span>Trouble viewing? Use the download button at top right.</span><a class="resource-viewer-download-text" download>Download file</a></footer></div></div>`;
}

export function bindResourceDocumentViewer(container){
  if(!container)return;
  document.body.insertAdjacentHTML('beforeend',viewerMarkup());
  const viewer=document.querySelector('.resource-viewer:last-of-type');
  const title=viewer.querySelector('#resourceViewerTitle');
  const content=viewer.querySelector('.resource-viewer-content');
  const external=viewer.querySelector('.resource-viewer-external');
  const downloads=viewer.querySelectorAll('.resource-viewer-download,.resource-viewer-download-text');
  let returnFocus=null;

  const close=()=>{
    viewer.hidden=true;
    content.replaceChildren();
    document.body.classList.remove('resource-viewer-open');
    returnFocus?.focus();
  };

  container.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-resource-view]');
    if(!button)return;
    const url=safeHttpsUrl(button.dataset.url);
    if(!url)return;
    const label=button.dataset.title||'Academic document';
    const mimeType=button.dataset.mimeType||'application/pdf';
    title.textContent=label;
    external.href=url;
    downloads.forEach((link)=>{link.href=url;link.setAttribute('download','')});
    const preview=mimeType.startsWith('image/')?document.createElement('img'):document.createElement('iframe');
    preview.src=url;
    preview.title=label;
    if(preview.tagName==='IMG')preview.alt=label;
    content.replaceChildren(preview);
    returnFocus=button;
    viewer.hidden=false;
    document.body.classList.add('resource-viewer-open');
    viewer.querySelector('.resource-viewer-close').focus();
  });

  viewer.querySelector('.resource-viewer-close').addEventListener('click',close);
  viewer.addEventListener('click',(event)=>{if(event.target===viewer)close()});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!viewer.hidden)close()});
}
