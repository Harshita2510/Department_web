import { escapeHtml } from './shared/dom.js';
import { pageSettingsService } from './services/page-settings.service.js';

const $=(selector)=>document.querySelector(selector);
const definitions={
  admission:{title:'Admission content',description:'Edit the undergraduate, postgraduate, doctoral and official admission information.',labels:{eyebrow:'Page label',title:'Main heading',accent:'Highlighted heading',description:'Introduction',undergraduateTitle:'Undergraduate title',undergraduateDescription:'Undergraduate description',postgraduateTitle:'Postgraduate title',postgraduateDescription:'Postgraduate description',doctoralTitle:'Doctoral title',doctoralDescription:'Doctoral description',officialTitle:'Official admissions title',officialDescription:'Official admissions description',officialUrl:'Official admissions link'}},
  research:{title:'Research content',description:'Edit research areas and the public labels for publications, projects and laboratories.',labels:{eyebrow:'Page label',title:'Main heading',description:'Introduction',area1Title:'Research area 1 title',area1Description:'Research area 1 description',area2Title:'Research area 2 title',area2Description:'Research area 2 description',area3Title:'Research area 3 title',area3Description:'Research area 3 description',publicationsTitle:'Publications title',publicationsDescription:'Publications description',projectsTitle:'Patents and projects title',projectsDescription:'Patents and projects description',laboratoriesTitle:'Laboratories title',laboratoriesDescription:'Laboratories description'}},
  events:{title:'Events page content',description:'Edit the static introduction; published event entries are managed from Published events.',labels:{eyebrow:'Page label',title:'Page heading',description:'Introduction',sectionLabel:'Event list label',sectionTitle:'Event list heading'}},
  placements:{title:'Placements page content',description:'Edit the static introduction; year-wise placement records are managed separately.',labels:{eyebrow:'Page label',title:'Page heading',description:'Introduction',sectionLabel:'Records section label',sectionTitle:'Records section heading',sectionDescription:'Records section description'}}
};
let currentPage='';
let values={};
let currentSection='';
const researchCategories={areas:'Research area',publications:'Publication',projects:'Patent & project',laboratories:'Laboratory'};

function fieldMarkup(key,label,value){
  const long=key.toLowerCase().includes('description');
  return `<label class="field ${long?'full':''}"><span>${escapeHtml(label)}</span>${long?`<textarea name="${escapeHtml(key)}" required maxlength="2000" rows="5">${escapeHtml(value)}</textarea>`:`<input name="${escapeHtml(key)}" required maxlength="2000" value="${escapeHtml(value)}">`}</label>`;
}
async function openEditor(page,section){
  currentPage=page;
  currentSection=section;
  const definition=definitions[page];
  $('#pageSettingsKicker').textContent=`${page} section`;
  $('#pageSettingsTitle').textContent=definition.title;
  $('#pageSettingsDescription').textContent=definition.description;
  $('#pageSettingsFields').innerHTML='<p>Loading page content…</p>';
  try{
    values=await pageSettingsService.getAdmin(page);
    $('#pageSettingsFields').innerHTML=Object.entries(definition.labels).map(([key,label])=>fieldMarkup(key,label,values[key]||'')).join('');
    const target=$(`[name="${section}Title"]`)||$(`[name="${section}Description"]`);
    target?.focus();
    $('#pageSettingsRecordActions').hidden=page!=='research';
    if(page==='research')$('#manageResearchRecords').textContent=`Manage ${researchCategories[section]||'research'} records`;
  }catch(error){$('#pageSettingsFields').innerHTML=`<p>${escapeHtml(error.message)}</p>`}
}
window.addEventListener('admin:page-settings',(event)=>openEditor(event.detail.page,event.detail.section));
$('#manageResearchRecords').addEventListener('click',()=>window.dispatchEvent(new CustomEvent('admin:manage-research-records',{detail:{category:researchCategories[currentSection]}})));
$('#pageSettingsForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const button=event.submitter;button.disabled=true;button.textContent='Saving…';
  const payload=Object.fromEntries(new FormData(event.currentTarget).entries());
  try{values=await pageSettingsService.update(currentPage,payload);$('#cmsToast').textContent='Page content published.';$('#cmsToast').classList.add('show')}catch(error){$('#cmsToast').textContent=error.message;$('#cmsToast').classList.add('show')}finally{button.disabled=false;button.textContent='Save and publish page'}
});
