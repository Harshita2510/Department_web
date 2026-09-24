import { facultyPhotoUrl } from '../shared/faculty-photo.js';
import { escapeHtml, initials } from '../shared/dom.js';
import { safeHttpsUrl } from '../shared/security.js';
import { facultyService } from '../services/faculty.service.js';

const directory=document.querySelector('#facultyDirectory');
const result=document.querySelector('#facultyResult');
const form=document.querySelector('#facultySearch');
const query=document.querySelector('#facultyQuery');

function render(records){
  if(!records.length){directory.innerHTML='<div class="faculty-directory-empty"><strong>No published faculty profiles found.</strong><span>Try another faculty name or area of expertise.</span></div>';return}
  directory.innerHTML=records.map((record)=>{
    const profile=record.approvedSnapshot||{};
    const name=[profile.title,profile.fullName].filter(Boolean).join(' ')||'Faculty member';
    const photo=facultyPhotoUrl(safeHttpsUrl(profile.photoUrl,''),400);
    const href=`faculty-profile?facultyId=${encodeURIComponent(record.facultyId)}`;
    return `<article class="faculty-directory-card"><a href="${href}" aria-label="View ${escapeHtml(name)}'s faculty profile"><div class="faculty-card-photo">${photo?`<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy">`:`<span>${escapeHtml(initials(profile.fullName||record.facultyId))}</span>`}<div class="faculty-card-overlay"><b>View profile</b><i aria-hidden="true">↗</i></div></div><div class="faculty-card-copy"><h2>${escapeHtml(name)}</h2><p>${escapeHtml(profile.designation||'Faculty member')}</p></div></a></article>`;
  }).join('');
}
async function load(term=''){
  result.textContent=term?`Searching faculty for “${term}”…`:'Loading published faculty profiles…';
  try{const records=await facultyService.listPublic(term);render(records);result.textContent=term?`${records.length} ${records.length===1?'profile matches':'profiles match'} “${term}”.`:`Showing ${records.length} published faculty ${records.length===1?'profile':'profiles'}.`}
  catch(error){directory.innerHTML='<div class="faculty-directory-empty"><strong>Faculty profiles could not be loaded.</strong><span>Please refresh when the API is available.</span></div>';result.textContent=error.message}
}
form.addEventListener('submit',async(event)=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;await load(query.value.trim());button.disabled=false});
document.querySelector('#currentYear').textContent=new Date().getFullYear();
load();
