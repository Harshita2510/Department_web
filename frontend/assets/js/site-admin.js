import { facultyPhotoUrl } from './shared/faculty-photo.js';
import { $, $$, escapeHtml, initials } from './shared/dom.js';
import { formatDate } from './shared/format.js';
import { authService } from './services/auth.service.js';
import { facultyService } from './services/faculty.service.js';
import { placementService } from './services/placement.service.js';
import { contentService } from './services/content.service.js';
import { uploadService } from './services/upload.service.js';
import { academicDocumentService } from './services/academic-document.service.js';
import { academicSubjectService } from './services/academic-subject.service.js';
import { questionPaperService } from './services/question-paper.service.js';
import { homepageSettingsService } from './services/homepage-settings.service.js';
const ADMIN_SESSION_KEY = 'sgsitsAdminSession';
let adminSession;
const ADMIN_UPLOAD_COLLECTIONS = new Set(['events', 'documents']);
const API_CONTENT_TYPES={notices:'notice',news:'news',events:'event',documents:'document',media:'media'};

function requireAdministrator(action = 'manage website content') {
  if (adminSession?.role === 'admin') return true;
  showToast(`Administrator permission is required to ${action}.`);
  return false;
}

const typeConfig = {
  notices: { title: 'Notices', singular: 'Notice', description: 'Publish academic, examination, admission and student notices.', categories: ['Academic', 'Examination', 'Admission', 'Student affairs', 'General'] },
  news: { title: 'News & stories', singular: 'News story', description: 'Share institute news, achievements, announcements and campus stories.', categories: ['Institute', 'Department', 'Research', 'Achievement', 'Campus'] },
  events: { title: 'Events', singular: 'Event', description: 'Manage seminars, workshops, conferences and student activities.', categories: ['Workshop', 'Seminar', 'Conference', 'Students', 'Cultural'] },
  placements: { title: 'Placement resources', singular: 'Placement resource', description: 'Publish a year-wise archive using either a public sheet link or an uploaded PDF.', categories: ['Placement sheet'] },
  documents: { title: 'Research records', singular: 'Research record', description: 'Publish research areas, papers, projects, patents and laboratory information.', categories: ['Research area', 'Publication', 'Patent & project', 'Laboratory', 'Report'] },
  media: { title: 'Media library', singular: 'Media asset', description: 'Upload and organise approved website images and files.', categories: ['Image', 'Document', 'Video', 'Other'] }
};

const starterData = {notices:[],news:[],events:[],placements:[],documents:[],media:[]};
let store = structuredClone(starterData);
Object.keys(typeConfig).forEach((type) => { if (!Array.isArray(store[type])) store[type] = []; });
let currentType = 'notices';
let selectedIds = new Set();
let pendingFile = null;
let pendingPlacementPdf=null;
let toastTimer;
let facultyProfiles=[];
let facultyAccounts=[];
let academicSubjects=[];
let academicDocuments=[];
let questionPapers=[];
let homepageSettings=null;

function showToast(message) {
  const toast = $('#cmsToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
}

function getFacultyProfiles() {
  return facultyProfiles;
}

function getFacultyAccounts() {
  return facultyAccounts;
}

function hasCompleteApprovedFacultyProfile(profile){
  const approved=profile||{};
  return Boolean(
    approved.fullName?.trim()&&approved.designation?.trim()&&approved.email?.trim()&&
    approved.highestQualification?.trim()&&approved.areaOfSpecialisation?.trim()&&
    approved.photoUrl?.trim()&&Number.isFinite(approved.experienceYears)&&approved.experienceYears>=0
  );
}

function flattenFaculty(record){
  const draft=record.draft||{};
  return {...draft,id:record._id,facultyId:record.facultyId,photo:draft.photoUrl||'',reviewStatus:record.reviewStatus,isPublished:hasCompleteApprovedFacultyProfile(record.approvedSnapshot),hasApprovedSnapshot:Boolean(record.approvedSnapshot),submittedAt:record.submittedAt,updatedAt:record.updatedAt};
}

function flattenContent(item){
  return {...item,id:item._id,date:item.displayDate?String(item.displayDate).slice(0,10):'',file:item.asset?{...item.asset,type:item.asset.mimeType,data:item.asset.url}:null};
}

async function hydrateMongoData(){
  const requests={
    profiles:facultyService.list(),accounts:authService.listFacultyAccounts(),placements:placementService.listAdmin(1),
    content:contentService.listAdmin(),subjects:academicSubjectService.listManaged(),
    documents:academicDocumentService.listAdmin(),papers:questionPaperService.listAdmin(),homepage:homepageSettingsService.getAdmin()
  };
  const keys=Object.keys(requests);
  const results=await Promise.allSettled(Object.values(requests));
  const loaded=Object.fromEntries(results.map((result,index)=>[keys[index],result.status==='fulfilled'?result.value:null]));
  if(loaded.profiles)facultyProfiles=loaded.profiles.map(flattenFaculty);
  if(loaded.accounts)facultyAccounts=loaded.accounts;
  if(loaded.subjects)academicSubjects=loaded.subjects;
  if(loaded.documents)academicDocuments=loaded.documents;
  if(loaded.papers)questionPapers=loaded.papers;
  if(loaded.homepage)homepageSettings=loaded.homepage;
  if(loaded.content){
    ['notices','news','events','documents','media'].forEach((key)=>{store[key]=[]});
    const collectionKeys={notice:'notices',news:'news',event:'events',document:'documents',media:'media'};
    loaded.content.forEach((item)=>{const key=collectionKeys[item.type];if(key)store[key].push(flattenContent(item))});
  }
  if(loaded.placements)store.placements=loaded.placements.map((item)=>({...item,id:item._id,title:`Placement ${item.academicYear.replace('-', '—')}`,category:item.sourceType==='pdf'?'Placement PDF':'Placement sheet',summary:`Open the placement ${item.sourceType==='pdf'?'PDF':'sheet'} for academic year ${item.academicYear.replace('-', '—')}.`,file:item.document?{...item.document,type:item.document.mimeType,data:item.document.url}:null}));
  updateCounts();updateDashboard();renderUserAccounts();renderFaculty();
  if(typeConfig[currentType])renderCollection();
  const failures=results.filter((result)=>result.status==='rejected');
  if(failures.length)showToast(`${failures.length} admin section${failures.length===1?'':'s'} could not be refreshed. Other loaded data remains available.`);
}

async function refreshContentCollection(viewName){
  const apiType=API_CONTENT_TYPES[viewName];
  if(!apiType)return;
  const items=await contentService.listAdmin(apiType);
  store[viewName]=items.map(flattenContent);
  updateCounts();updateDashboard();
  if(currentType===viewName)renderCollection();
}

async function verifyAdministratorSession(){
  try{
    const user=await authService.me();
    if(user.role!=='admin')throw new Error('Administrator access is required');
    adminSession=user;
    $('#adminAccountIdentifier').textContent=user.email||user.facultyId||'Authenticated account';
    await hydrateMongoData();
  }catch{
    adminSession=null;
    window.location.replace('../index.html?adminLogin=required');
  }
}

function allContent() {
  return Object.entries(store).flatMap(([type, items]) => items.map((item) => ({ ...item, type })));
}

function updateCounts() {
  Object.keys(typeConfig).forEach((type) => $$(`[data-count="${type}"]`).forEach((node) => node.textContent = store[type].length));
  $$('[data-count="faculty"]').forEach((node) => node.textContent = getFacultyProfiles().length);
}

function updateDashboard() {
  const content = allContent();
  const faculty = getFacultyProfiles();
  const timetableSlots=academicDocuments.filter((item)=>item.resourceType==='timetable').flatMap((item)=>Object.values(item.timetableFiles||{}));
  const calendars=academicDocuments.filter((item)=>item.resourceType==='academic-calendar');
  const published=content.filter((item)=>item.status==='published').length+
    faculty.filter((item)=>item.isPublished).length+
    academicSubjects.filter((item)=>item.syllabusStatus==='published').length+
    timetableSlots.filter((item)=>item?.status==='published').length+
    calendars.filter((item)=>item.status==='published').length+
    questionPapers.filter((item)=>item.status==='published').length;
  const drafts=content.filter((item)=>item.status==='draft').length+
    academicSubjects.filter((item)=>['draft','submitted','changes_requested'].includes(item.syllabusStatus)).length+
    timetableSlots.filter((item)=>['draft','submitted','changes_requested'].includes(item?.status)).length+
    calendars.filter((item)=>item.status==='draft').length+
    questionPapers.filter((item)=>item.status==='draft').length;
  const submissions=faculty.filter((item)=>item.reviewStatus==='submitted').length+
    academicSubjects.filter((item)=>item.syllabusStatus==='submitted').length+
    timetableSlots.filter((item)=>item?.status==='submitted').length;
  const assets=content.filter((item)=>item.file).length+
    academicSubjects.filter((item)=>item.syllabus||item.publishedSyllabus).length+
    timetableSlots.filter((item)=>item?.asset||item?.publishedAsset).length+
    calendars.filter((item)=>item.documentUrl).length+
    questionPapers.filter((item)=>item.asset).length;
  $('#publishedStat').textContent=published;
  $('#draftStat').textContent=drafts;
  $('#submissionStat').textContent=submissions;
  $('#mediaStat').textContent=assets;
}

async function refreshDashboardResources(){
  [academicSubjects,academicDocuments,questionPapers]=await Promise.all([
    academicSubjectService.listManaged(),academicDocumentService.listAdmin(),questionPaperService.listAdmin()
  ]);
  updateDashboard();
}

function showView(viewName) {
  $$('.cms-view').forEach((view) => view.classList.remove('active'));
  $$('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === viewName));
  $$('[data-admin-nav-group]').forEach((group) => {
    const containsActive = Boolean(group.querySelector('[data-view].active'));
    group.classList.toggle('contains-active', containsActive);
    if (containsActive) group.classList.add('open');
    group.querySelector('[data-admin-nav-toggle]')?.setAttribute('aria-expanded', String(group.classList.contains('open')));
  });
  let view;
  const timetableMode = viewName === 'classTimetableManagement'
    ? 'class'
    : viewName === 'examTimetableManagement' ? 'exam' : null;
  const pageSettingsAliases={
    admissionUndergraduate:{page:'admission',section:'undergraduate'},admissionPostgraduate:{page:'admission',section:'postgraduate'},admissionDoctoral:{page:'admission',section:'doctoral'},admissionOfficial:{page:'admission',section:'official'},
    researchAreas:{page:'research',section:'areas'},researchPublications:{page:'research',section:'publications'},researchProjects:{page:'research',section:'projects'},researchLaboratories:{page:'research',section:'laboratories'},
    eventsSettings:{page:'events',section:'page'},placementsSettings:{page:'placements',section:'page'}
  };
  const pageSettingsTarget=pageSettingsAliases[viewName];
  if (typeConfig[viewName]) {
    currentType = viewName;
    view = $('#collectionView');
    setupCollection();
    refreshContentCollection(viewName).catch((error)=>showToast(`Could not refresh ${typeConfig[viewName].title.toLowerCase()}: ${error.message}`));
  } else {
    view = timetableMode ? $('#timetableManagementView') : pageSettingsTarget ? $('#pageSettingsView') : ($(`#${viewName}View`) || $('#dashboardView'));
    if(timetableMode)window.dispatchEvent(new CustomEvent('admin:timetable-mode',{detail:{mode:timetableMode}}));
    if(pageSettingsTarget)window.dispatchEvent(new CustomEvent('admin:page-settings',{detail:pageSettingsTarget}));
    if (viewName === 'faculty') renderFaculty();
    if(viewName==='homepage')renderHomepageSettings();
    if(viewName==='dashboard'&&adminSession)refreshDashboardResources().catch((error)=>showToast(error.message));
  }
  view.classList.add('active');
  const timetableTitle=timetableMode==='class'?'Class timetable':timetableMode==='exam'?'Exam, quiz & practical timetable':null;
  const pageSettingsTitle=pageSettingsTarget?`${pageSettingsTarget.page[0].toUpperCase()}${pageSettingsTarget.page.slice(1)} content`:null;
  $('#viewTitle').textContent = timetableTitle || pageSettingsTitle || (view.dataset.title === 'Content' ? typeConfig[currentType].title : view.dataset.title);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeSidebar();
}

function renderHomepageSettings(){
  if(!homepageSettings)return;
  $('#homepageHeroEyebrow').value=homepageSettings.heroEyebrow||'';
  $('#homepageHeroTitle').value=homepageSettings.heroTitle||'';
  $('#homepageHeroOverview').value=homepageSettings.heroOverview||'';
  $('#homepageImageCaptionTitle').value=homepageSettings.imageCaptionTitle||'';
  $('#homepageImageCaptionSubtitle').value=homepageSettings.imageCaptionSubtitle||'';
  $('#homepageDepartmentPhone').value=homepageSettings.departmentPhone||'';
  $('#homepageDepartmentEmail').value=homepageSettings.departmentEmail||'';
  $('#homepageVisionHeadingInput').value=homepageSettings.visionHeading||'';
  $('#homepageVisionTextInput').value=homepageSettings.visionText||'';
  $('#homepageMissionHeadingInput').value=homepageSettings.missionHeading||'';
  (homepageSettings.highlights||[]).slice(0,3).forEach((item,index)=>{
    $(`#homepageHighlightValue${index+1}`).value=item.value||'';
    $(`#homepageHighlightLabel${index+1}`).value=item.label||'';
  });
  for(let index=0;index<4;index+=1)$(`#homepageMission${index+1}`).value=homepageSettings.missionItems?.[index]||'';
  renderHomepageOutcomes(homepageSettings.programOutcomes||[]);
}

function renderHomepageOutcomes(outcomes){
  $('#homepageOutcomeEditors').innerHTML=outcomes.map((outcome,index)=>`<article class="homepage-outcome-editor" data-homepage-outcome><header><strong>${escapeHtml(outcome.code||`PO${index+1}`)}</strong><button type="button" data-remove-homepage-outcome aria-label="Remove ${escapeHtml(outcome.code||`program outcome ${index+1}`)}">− Remove</button></header><div class="form-grid"><label class="field"><span>Code</span><input data-outcome-code required maxlength="10" value="${escapeHtml(outcome.code||'')}"></label><label class="field"><span>Title</span><input data-outcome-title required maxlength="160" value="${escapeHtml(outcome.title||'')}"></label><label class="field full"><span>Description</span><textarea data-outcome-description required minlength="10" maxlength="1500" rows="4">${escapeHtml(outcome.description||'')}</textarea></label></div></article>`).join('');
}

function addHomepageOutcome(){
  const current=$$('[data-homepage-outcome]',$('#homepageOutcomeEditors')).map((item)=>({code:$('[data-outcome-code]',item).value,title:$('[data-outcome-title]',item).value,description:$('[data-outcome-description]',item).value}));
  if(current.length>=20){showToast('A maximum of 20 program outcomes is supported.');return}
  current.push({code:`PO${current.length+1}`,title:'',description:''});renderHomepageOutcomes(current);
  $$('[data-homepage-outcome]',$('#homepageOutcomeEditors')).at(-1)?.querySelector('[data-outcome-title]')?.focus();
}

async function saveHomepageSettings(event){
  event.preventDefault();
  const form=$('#homepageSettingsForm');if(!form.reportValidity())return;
  const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Saving—';
  const payload={
    heroEyebrow:$('#homepageHeroEyebrow').value.trim(),heroTitle:$('#homepageHeroTitle').value.trim(),heroOverview:$('#homepageHeroOverview').value.trim(),
    highlights:[1,2,3].map((index)=>({value:$(`#homepageHighlightValue${index}`).value.trim(),label:$(`#homepageHighlightLabel${index}`).value.trim()})),
    imageCaptionTitle:$('#homepageImageCaptionTitle').value.trim(),imageCaptionSubtitle:$('#homepageImageCaptionSubtitle').value.trim(),
    departmentPhone:$('#homepageDepartmentPhone').value.trim(),departmentEmail:$('#homepageDepartmentEmail').value.trim(),
    visionHeading:$('#homepageVisionHeadingInput').value.trim(),visionText:$('#homepageVisionTextInput').value.trim(),
    missionHeading:$('#homepageMissionHeadingInput').value.trim(),missionItems:[1,2,3,4].map((index)=>$(`#homepageMission${index}`).value.trim()),
    programOutcomes:$$('[data-homepage-outcome]',$('#homepageOutcomeEditors')).map((item)=>({code:$('[data-outcome-code]',item).value.trim(),title:$('[data-outcome-title]',item).value.trim(),description:$('[data-outcome-description]',item).value.trim()}))
  };
  try{homepageSettings=await homepageSettingsService.update(payload);renderHomepageSettings();showToast('Homepage content published. Open the public site to review it.');}
  catch(error){showToast(error.message)}finally{button.disabled=false;button.textContent='Save and publish homepage'}
}

function setupCollection() {
  const config = typeConfig[currentType];
  $('#collectionKicker').textContent = currentType === 'media' ? 'Assets & uploads' : 'Website content';
  $('#collectionTitle').textContent = config.title;
  $('#collectionDescription').textContent = config.description;
  $('#collectionCreate').textContent = `+ Add ${config.singular.toLowerCase()}`;
  $('#categoryFilter').innerHTML = `<option value="all">All categories</option>${config.categories.map((item) => `<option>${escapeHtml(item)}</option>`).join('')}`;
  $('#collectionSearch').value = '';
  $('#statusFilter').value = 'all';
  selectedIds.clear();
  renderCollection();
}

function filteredItems() {
  const query = $('#collectionSearch').value.trim().toLowerCase();
  const status = $('#statusFilter').value;
  const category = $('#categoryFilter').value;
  return store[currentType].filter((item) => {
    const matchesStatus=status==='all'||item.status===status||(status==='published'&&Boolean(item.publishedSnapshot));
    return (!query || `${item.title||''} ${item.summary||''} ${item.category||''}`.toLowerCase().includes(query))&&matchesStatus&&(category==='all'||item.category===category);
  });
}

function renderCollection() {
  const items = filteredItems();
  $('#contentRows').innerHTML = items.map((item) => {const hasPendingPublishedRevision=item.status==='draft'&&Boolean(item.publishedSnapshot);const publishAction=item.status==='published'?'Move to draft':hasPendingPublishedRevision?'Publish revision':'Publish';return `<tr>
    <td><input type="checkbox" data-select-id="${item.id}" ${selectedIds.has(item.id) ? 'checked' : ''} aria-label="Select ${escapeHtml(item.title)}"></td>
    <td class="content-title"><b>${escapeHtml(item.title)}</b><small>${item.file ? `Attachment: ${escapeHtml(item.file.name)}` : escapeHtml(item.summary || 'No summary')}</small></td>
    <td>${escapeHtml(item.category || '—')}</td><td>${formatDate(item.updatedAt || item.date)}</td>
    <td><span class="status-pill ${item.status === 'draft' ? 'draft' : ''}">${hasPendingPublishedRevision?'Live · revision draft':escapeHtml(item.status)}</span></td>
    <td><div class="row-actions"><button type="button" data-edit-id="${item.id}" aria-label="Edit ${escapeHtml(item.title)}">Edit</button><button type="button" data-toggle-id="${item.id}" aria-label="${publishAction} ${escapeHtml(item.title)}">${publishAction}</button><button class="row-delete" type="button" data-delete-id="${item.id}" aria-label="Delete ${escapeHtml(item.title)}">− Delete</button></div></td>
  </tr>`}).join('');
  $('#tableEmpty').classList.toggle('show', items.length === 0);
  $('.content-table').style.display = items.length ? 'table' : 'none';
  $$('[data-select-id]').forEach((checkbox) => checkbox.addEventListener('change', () => { checkbox.checked ? selectedIds.add(checkbox.dataset.selectId) : selectedIds.delete(checkbox.dataset.selectId); updateBulkBar(); }));
  $$('[data-edit-id]').forEach((button) => button.addEventListener('click', () => openContentDrawer(currentType, button.dataset.editId)));
  $$('[data-delete-id]').forEach((button)=>button.addEventListener('click',async()=>{
    const item=store[currentType].find((entry)=>entry.id===button.dataset.deleteId);
    if(!item||!confirm(`Delete “${item.title}” permanently?`))return;
    try{if(currentType==='placements')await placementService.remove(item.id);else await contentService.remove(item.id);store[currentType]=store[currentType].filter((entry)=>entry.id!==item.id);updateDashboard();updateCounts();renderCollection();showToast('Content deleted.')}catch(error){showToast(error.message)}
  }));
  $$('[data-toggle-id]').forEach((button) => button.addEventListener('click', async () => {
    const item = store[currentType].find((entry) => entry.id === button.dataset.toggleId);
    const status=item.status==='published'?'draft':'published';
    try{if(currentType==='placements')await placementService.update(item.id,{status});else await contentService.update(item.id,{status});item.status=status;item.updatedAt=new Date().toISOString();updateDashboard();updateCounts();renderCollection();showToast(item.status==='published'?'Content published.':'Content moved to drafts.')}catch(error){showToast(error.message)}
  }));
  updateBulkBar();
}

function updateBulkBar() {
  $('#selectedCount').textContent = selectedIds.size;
  $('#bulkBar').classList.toggle('show', selectedIds.size > 0);
  $('#selectAll').checked = filteredItems().length > 0 && filteredItems().every((item) => selectedIds.has(item.id));
}

function openContentDrawer(type, id = '') {
  if (!requireAdministrator(`${id ? 'edit' : 'create'} ${type}`)) return;
  currentType = type;
  const config = typeConfig[type];
  const item = id ? store[type].find((entry) => entry.id === id) : null;
  const isPlacement = type === 'placements';
  const isNotice = type === 'notices';
  $('#drawerKicker').textContent = item ? `Edit ${config.singular.toLowerCase()}` : `Create ${config.singular.toLowerCase()}`;
  $('#drawerTitle').textContent = item?.title || `New ${config.singular.toLowerCase()}`;
  $('#editingId').value = item?.id || '';
  $('#contentTitle').value = item?.title || '';
  $('#genericContentFields').hidden = isPlacement;
  $('#placementFields').hidden = !isPlacement;
  $('#contentTitle').required = !isPlacement;
  $('#placementYear').required = isPlacement;
  $('#placementYear').value = item?.academicYear || (item?.title || '').replace(/^Placement\s+/i, '').replace(/—/g, '-');
  $('#placementSheetUrl').value = item?.sheetUrl || '';
  const placementSource=item?.sourceType||(item?.document?'pdf':'link');
  const sourceInput=document.querySelector(`input[name="placementSource"][value="${placementSource}"]`);
  if(sourceInput)sourceInput.checked=true;
  pendingPlacementPdf=item?.document?{...item.document,raw:null}:null;
  setPlacementSource(placementSource);
  $('#contentCategory').innerHTML = config.categories.map((category) => `<option ${item?.category === category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('');
  $('#contentDate').value = item?.date || new Date().toISOString().slice(0, 10);
  $('#contentSummary').value = item?.summary || '';
  $('#contentBody').value = item?.body || '';
  const summaryLabel = $('#contentSummary').closest('label').querySelector('span');
  const bodyLabel = $('#contentBody').closest('label').querySelector('span');
  summaryLabel.textContent = isNotice ? 'Short description (optional)' : 'Summary';
  bodyLabel.textContent = isNotice ? 'Long description (optional)' : 'Full content';
  $('#contentSummary').required = false;
  $('#contentSummary').maxLength = isNotice ? 240 : 400;
  $('#contentSummary').placeholder = isNotice ? 'Optional — the title is used when left empty' : 'Short summary for cards and search results';
  $('#contentBody').required = false;
  $('#contentBody').placeholder = isNotice ? 'Optional — the title is used when left empty' : 'Write the complete content here—';
  $('#contentFeatured').checked = isNotice ? item?.showInTicker !== false : Boolean(item?.featured);
  $('.feature-check strong').textContent = isNotice ? 'Show in homepage ticker' : 'Feature this content';
  $('.feature-check small').textContent = isNotice ? 'Display this published notice in the announcement strip at the top of the homepage.' : 'Give this item priority on relevant public pages.';
  pendingFile = item?.file || null;
  const uploadRules = {
    notices: { accept: 'application/pdf,image/jpeg,image/png', help: 'Official PDF, JPEG or PNG — Maximum 10 MB' },
    events: { accept: 'image/jpeg,image/png,image/webp,application/pdf', help: 'Event image or PDF — Maximum 2 MB' },
    documents: { accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv', help: 'PDF, Word, Excel or CSV — Maximum 2 MB' }
  };
  const uploadRule = uploadRules[type] || { accept: '', help: 'Click to choose a file — Maximum 2 MB' };
  $('#contentFile').accept = uploadRule.accept;
  $('#uploadHelp').textContent = uploadRule.help;
  $('#uploadPermissionText').textContent = isNotice ? 'The administrator and faculty granted Notice upload access can attach a PDF, JPEG or PNG. Only the administrator can publish it.' : ADMIN_UPLOAD_COLLECTIONS.has(type) ? `Only the website administrator can upload ${config.title.toLowerCase()}.` : 'Only website administrators can upload this attachment.';
  $('#deleteCurrent').hidden = !item;
  renderAttachedFile();
  $('#editorDrawer').classList.add('open');
  $('#editorDrawer').setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  setTimeout(() => (isPlacement ? $('#placementYear') : $('#contentTitle')).focus(), 100);
}

function closeContentDrawer() {
  $('#editorDrawer').classList.remove('open');
  $('#editorDrawer').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  $('#contentForm').reset(); pendingFile = null;pendingPlacementPdf=null;
}

function setPlacementSource(source){
  const isLink=source==='link';
  $('#placementLinkFields').hidden=!isLink;
  $('#placementPdfFields').hidden=isLink;
  $('#placementSheetUrl').required=currentType==='placements'&&isLink;
  renderPlacementPdf();
}

function renderPlacementPdf(){
  const box=$('#placementPdfName');
  box.hidden=!pendingPlacementPdf;
  box.innerHTML=pendingPlacementPdf?`<strong>${escapeHtml(pendingPlacementPdf.name)}</strong> — ${Math.ceil(pendingPlacementPdf.size/1024)} KB <button type="button" id="removePlacementPdf">Remove</button>`:'';
  $('#removePlacementPdf')?.addEventListener('click',()=>{pendingPlacementPdf=null;$('#placementPdfInput').value='';renderPlacementPdf()});
}

function renderAttachedFile() {
  const box = $('#attachedFile');
  box.hidden = !pendingFile;
  box.innerHTML = pendingFile ? `<strong>${escapeHtml(pendingFile.name)}</strong> — ${Math.ceil(pendingFile.size / 1024)} KB <button type="button" id="removeAttached">Remove</button>` : '';
  $('#removeAttached')?.addEventListener('click', () => { pendingFile = null; renderAttachedFile(); });
}

function readUpload(file, callback) {
  if (!requireAdministrator('upload files')) return;
  if (!file) return;
  const limit = currentType === 'notices' ? 10 : 2;
  if (currentType === 'notices' && !['application/pdf','image/jpeg','image/png'].includes(file.type)) { showToast('Notice attachments must be PDF, JPEG or PNG files.'); return; }
  if (file.size > limit * 1024 * 1024) { showToast(`Files in this section must be ${limit} MB or smaller.`); return; }
  const reader = new FileReader();
  reader.onload = () => callback({ name:file.name, type:file.type || 'application/octet-stream', size:file.size, data:reader.result, raw:file });
  reader.onerror = () => showToast('The selected file could not be read.');
  reader.readAsDataURL(file);
}

async function saveContent(status) {
  if (!requireAdministrator(`${status === 'published' ? 'publish' : 'save'} ${currentType}`)) return;
  if (!$('#contentForm').reportValidity()) return;
  if (currentType === 'media' && !pendingFile) { showToast('Choose a file before saving a media asset.'); return; }
  if (currentType === 'documents' && !pendingFile) { showToast('Choose a document before saving this entry.'); return; }
  if (currentType === 'notices' && !pendingFile) { showToast('Choose the official notice attachment before saving.'); return; }
  const id = $('#editingId').value;
  const existing = id ? store[currentType].find((entry) => entry.id === id) : null;
  let entry;
  if (currentType === 'placements') {
    const academicYear = $('#placementYear').value.trim().replace(/[——]/g, '-');
    if (!/^\d{4}-\d{2}$/.test(academicYear)) { showToast('Enter the academic year in YYYY-YY format, for example 2025-26.'); $('#placementYear').focus(); return; }
    const [startYear, shortEndYear] = academicYear.split('-');
    if ((Number(startYear) + 1) % 100 !== Number(shortEndYear)) { showToast('The placement year must cover consecutive years, for example 2025-26.'); $('#placementYear').focus(); return; }
    if (store.placements.some((item) => item.id !== id && item.academicYear === academicYear)) { showToast(`A placement sheet for ${academicYear} already exists.`); $('#placementYear').focus(); return; }
    const sourceType=document.querySelector('input[name="placementSource"]:checked')?.value||'link';
    let sheetUrl='';
    if(sourceType==='link'){
      try { sheetUrl = new URL($('#placementSheetUrl').value.trim()).href; } catch { showToast('Enter a valid public sheet link.'); $('#placementSheetUrl').focus(); return; }
      if (!sheetUrl.startsWith('https://')) { showToast('The public sheet link must begin with https://.'); $('#placementSheetUrl').focus(); return; }
    }else if(!pendingPlacementPdf){showToast('Choose a placement PDF before saving.');return}
    const displayYear = `${startYear}—${shortEndYear}`;
    entry = { id: id || crypto.randomUUID(), title: `Placement ${displayYear}`, academicYear, sourceType, sheetUrl, category: sourceType==='pdf'?'Placement PDF':'Placement sheet', date: '', summary: `Open the placement ${sourceType==='pdf'?'PDF':'sheet'} for academic year ${displayYear}.`, body: '', featured: false, file:sourceType==='pdf'?pendingPlacementPdf:null, status, updatedAt: new Date().toISOString() };
  } else {
    entry = {
      id: id || crypto.randomUUID(), title: $('#contentTitle').value.trim(), category: $('#contentCategory').value,
      date: $('#contentDate').value, summary: $('#contentSummary').value.trim(), body: $('#contentBody').value.trim(),
      featured: currentType==='notices'?false:$('#contentFeatured').checked, showInTicker:currentType==='notices'?$('#contentFeatured').checked:undefined, file: pendingFile, status, updatedAt: new Date().toISOString()
    };
  }
  if(currentType==='placements'){
    try{
      const uploadingPdf=entry.sourceType==='pdf'&&Boolean(pendingPlacementPdf?.raw);
      const placementPayload={academicYear:entry.academicYear,sourceType:entry.sourceType,sheetUrl:entry.sheetUrl,status:uploadingPdf?'draft':status};
      let saved=id?await placementService.update(id,placementPayload):await placementService.create(placementPayload);
      if(!id)$('#editingId').value=saved._id;
      if(uploadingPdf){
        saved=await placementService.uploadPdf(saved._id,pendingPlacementPdf.raw);
        pendingPlacementPdf={...saved.document,raw:null};
        renderPlacementPdf();
        if(status==='published')saved=await placementService.update(saved._id,{status:'published'});
      }
      entry={...entry,...saved,id:saved._id,file:saved.document?{...saved.document,type:saved.document.mimeType,data:saved.document.url}:null};
    }catch(error){showToast(error.message);return}
  }
  else{
    try{
      let asset=existing?.asset||null;
      let noticeFileId='';
      if(pendingFile?.raw)asset=currentType==='notices'
        ? await uploadService.uploadNoticeAttachment(pendingFile.raw)
        : pendingFile.type.startsWith('image/')
          ? await uploadService.uploadImage(pendingFile.raw,currentType)
          : await uploadService.upload(pendingFile.raw);
      const payload={type:API_CONTENT_TYPES[currentType],title:entry.title,category:entry.category,summary:entry.summary,body:entry.body,displayDate:entry.date||undefined,featured:entry.featured,status};
      if(currentType==='notices')payload.showInTicker=entry.showInTicker;
      if(currentType==='notices'&&pendingFile?.raw)noticeFileId=asset.id||asset.key;
      if(noticeFileId)payload.noticeFileId=noticeFileId;
      else if(currentType!=='notices'&&asset)payload.asset=asset;
      const saved=id?await contentService.update(id,payload):await contentService.create(payload);entry=flattenContent(saved);
    }catch(error){showToast(error.message);return}
  }
  if (existing) Object.assign(existing, entry); else store[currentType].unshift(entry);
  updateDashboard();updateCounts();
  closeContentDrawer(); showView(currentType); showToast(status === 'published' ? `${typeConfig[currentType].singular} published.` : 'Draft saved.');
}

async function bulkSet(status) {
  if (!requireAdministrator(`${status === 'published' ? 'publish' : 'update'} ${currentType}`)) return;
  try{const selected=store[currentType].filter((item)=>selectedIds.has(item.id));if(currentType==='placements')await Promise.all(selected.map((item)=>placementService.update(item.id,{status})));else await Promise.all(selected.map((item)=>contentService.update(item.id,{status})))}catch(error){showToast(error.message);return}
  store[currentType].forEach((item) => { if (selectedIds.has(item.id)) { item.status = status; item.updatedAt = new Date().toISOString(); } });
  selectedIds.clear();updateDashboard();updateCounts();renderCollection();showToast(status === 'published' ? 'Selected content published.' : 'Selected content moved to drafts.');
}

function renderFaculty() {
  const profiles = getFacultyProfiles().map((profile)=>({...profile,safePhoto:facultyPhotoUrl(profile.photo,134)}));
  const grid=$('#facultyGrid');
  grid.innerHTML = profiles.map((profile,index) => `<article class="faculty-card"><div class="faculty-card-top"><div class="faculty-photo" data-faculty-photo-index="${index}">${profile.safePhoto ? '' : escapeHtml(initials(profile.fullName || profile.facultyId))}</div><span class="faculty-state ${profile.isPublished ? 'published' : ''}">${profile.reviewStatus === 'submitted' ? 'Review needed' : profile.isPublished ? 'Published' : 'Profile incomplete'}</span></div><h3>${escapeHtml(profile.fullName || 'Profile not completed')}</h3><p>${escapeHtml(profile.designation || `Faculty ID: ${profile.facultyId}`)}</p><span>${escapeHtml(profile.department || profile.email || 'Waiting for faculty details')}</span><footer><small>Updated ${formatDate(profile.updatedAt)}</small><div class="faculty-card-actions"><button type="button" data-edit-faculty="${encodeURIComponent(profile.facultyId)}">Review</button>${profile.isPublished?`<a href="faculty-profile.html?facultyId=${encodeURIComponent(profile.facultyId)}" target="_blank" rel="noopener">View published →</a>`:''}</div></footer></article>`).join('');
  profiles.forEach((profile,index)=>{
    if(profile.safePhoto)$(`[data-faculty-photo-index="${index}"]`,grid).style.backgroundImage=`url("${profile.safePhoto}")`;
  });
  $('#facultyEmpty').classList.toggle('show', profiles.length === 0);
  $$('[data-edit-faculty]').forEach((button) => button.addEventListener('click', () => openFacultyDrawer(decodeURIComponent(button.dataset.editFaculty))));
}

function openFacultyDrawer(facultyId = '') {
  if (!requireAdministrator('review faculty profiles')) return;
  const profile = facultyProfiles.find((item)=>item.facultyId===facultyId.toUpperCase())||{};
  $('#facultyEmailKey').value = profile.id||'';
  $('#facultyIdReview').value = profile.facultyId || facultyId;
  $('#adminReviewName').textContent=profile.fullName||'Faculty member';
  $('#adminReviewEmployeeNumber').textContent=profile.facultyId||'—';
  $('#adminReviewDesignation').textContent=profile.designation||'—';
  $('#adminReviewEmail').textContent=profile.email||'—';
  $('#adminReviewPhone').textContent=profile.phone||'Not provided';
  $('#adminReviewExperience').textContent=profile.experienceYears===''||profile.experienceYears==null?'—':`${profile.experienceYears} years`;
  $('#adminReviewQualification').textContent=profile.highestQualification||'—';
  $('#adminReviewSpecialisation').textContent=profile.areaOfSpecialisation||'—';
  const safePhoto=facultyPhotoUrl(profile.photo,184);
  const photo=$('#adminFacultyPhoto');photo.style.backgroundImage=safePhoto?`url("${safePhoto}")`:'';
  $('#adminFacultyInitials').textContent=initials(profile.fullName||profile.facultyId);$('#adminFacultyInitials').style.visibility=safePhoto?'hidden':'';
  $('#facultySubmissionData').innerHTML = profile.reviewStatus === 'submitted' ? `<strong>Faculty submission waiting</strong><br>Submitted ${formatDate(profile.submittedAt, true)}. Confirm the details, then approve and publish.` : profile.reviewStatus==='approved'&&profile.isPublished?'This profile is already approved and published.':profile.hasApprovedSnapshot?'<strong>Legacy profile is incomplete.</strong><br>The faculty member must complete all required fields, upload a photo, and submit it for approval again.':'Waiting for the faculty member to complete and submit this profile.';
  $('#approveFacultyProfile').disabled=profile.reviewStatus!=='submitted';
  $('#facultyDrawer').classList.add('open'); $('#facultyDrawer').setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll');
}

function closeFacultyDrawer() {
  $('#facultyDrawer').classList.remove('open'); $('#facultyDrawer').setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll');
}

async function approveFacultyProfile() {
  if (!requireAdministrator('approve faculty profiles')) return;
  const profileId = $('#facultyEmailKey').value;
  if(!profileId)return;
  try{const record=await facultyService.approve(profileId);const index=facultyProfiles.findIndex((item)=>item.id===profileId);if(index>=0)facultyProfiles[index]=flattenFaculty(record);closeFacultyDrawer();renderFaculty();renderUserAccounts();updateDashboard();updateCounts();showToast('Faculty profile approved and published.')}catch(error){showToast(error.message)}
}

async function deleteFacultyProfile(){
  if(!requireAdministrator('delete faculty profiles'))return;
  const profileId=$('#facultyEmailKey').value;
  const facultyId=$('#facultyIdReview').value;
  if(!profileId)return;
  if(!confirm(`Permanently delete faculty ${facultyId}? This will also delete the faculty login account and cannot be undone.`))return;
  const button=$('#deleteFacultyProfile');
  button.disabled=true;
  try{
    await facultyService.remove(profileId);
    facultyProfiles=facultyProfiles.filter((profile)=>profile.id!==profileId);
    facultyAccounts=facultyAccounts.filter((account)=>account.facultyId!==facultyId);
    closeFacultyDrawer();renderFaculty();renderUserAccounts();updateDashboard();updateCounts();
    showToast(`Faculty ${facultyId} and its login account were deleted.`);
  }catch(error){showToast(error.message)}
  finally{button.disabled=false}
}

function renderUserAccounts() {
  const accounts = getFacultyAccounts();
  $('#facultyAccountRows').innerHTML = accounts.length ? accounts.map((account) => {
    const canUploadNotices=account.permissions?.includes('notice_upload');
    return `<div class="user-row"><span><b>${escapeHtml(account.facultyId)}</b><small>Faculty login</small></span><span>Faculty member${canUploadNotices?'<small>Notice uploader</small>':''}</span><span><i></i> ${account.status === 'inactive' ? 'Inactive' : 'Active'}${account.mustChangePassword?'<small>Password change required</small>':''}</span><span class="user-access-actions"><button type="button" data-account-status="${escapeHtml(account.facultyId)}" data-status="${account.status==='inactive'?'active':'inactive'}">${account.status==='inactive'?'Activate':'Deactivate'}</button><button type="button" data-notice-access="${escapeHtml(account.facultyId)}" data-allowed="${!canUploadNotices}">${canUploadNotices?'Remove notice access':'Allow notices'}</button><button class="danger-link" type="button" data-reset-faculty-password="${escapeHtml(account.facultyId)}">Reset password</button></span></div>`;
  }).join('') : '<div class="user-row"><span><b>No faculty logins</b><small>Create the first Faculty ID</small></span><span>—</span><span>—</span><span>—</span></div>';
}

async function setFacultyNoticeAccess(facultyId,allowed){
  try{
    const updated=await authService.setFacultyNoticePermission(facultyId,allowed);
    const account=facultyAccounts.find((item)=>item.facultyId===facultyId);
    if(account)account.permissions=updated.permissions||[];
    renderUserAccounts();
    showToast(`${facultyId} ${allowed?'can now submit notice drafts':'no longer has notice upload access'}.`);
  }catch(error){showToast(error.message)}
}

function openFacultyAccountModal() {
  if (!requireAdministrator('create faculty accounts')) return;
  $('#facultyAccountForm').reset();
  clearRegistrationErrors();
  $('#newFacultyPassword').type = 'password';
  $('#toggleFacultyPassword').textContent = 'Show';
  $('#facultyAccountModal').classList.add('open');
  $('#facultyAccountModal').setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  setTimeout(() => $('#newFacultyId').focus(), 80);
}

function closeFacultyAccountModal() {
  if ($('#facultyAccountForm button[type="submit"]').disabled) return;
  $('#facultyAccountModal').classList.remove('open');
  $('#facultyAccountModal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}

function openFacultyPasswordReset(facultyId){
  if(!requireAdministrator('reset faculty passwords'))return;
  $('#facultyPasswordResetForm').reset();
  $('#resetFacultyId').value=facultyId;
  $('#resetFacultyPassword').type='password';
  $('#toggleResetFacultyPassword').textContent='Show';
  $('#facultyPasswordResetModal').classList.add('open');
  $('#facultyPasswordResetModal').setAttribute('aria-hidden','false');
  document.body.classList.add('no-scroll');
  setTimeout(()=>$('#resetFacultyPassword').focus(),80);
}

function closeFacultyPasswordReset(){
  $('#facultyPasswordResetModal').classList.remove('open');
  $('#facultyPasswordResetModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('no-scroll');
}

async function resetFacultyPassword(){
  if(!requireAdministrator('reset faculty passwords')||!$('#facultyPasswordResetForm').reportValidity())return;
  const facultyId=$('#resetFacultyId').value;
  const password=$('#resetFacultyPassword').value;
  if(password!==$('#confirmResetFacultyPassword').value){showToast('The temporary passwords do not match.');$('#confirmResetFacultyPassword').focus();return}
  try{
    await authService.resetFacultyPassword(facultyId,password);
    const account=facultyAccounts.find((item)=>item.facultyId===facultyId);
    if(account)account.mustChangePassword=true;
    renderUserAccounts();
    closeFacultyPasswordReset();
    showToast(`Password reset for ${facultyId}. Share the temporary password privately.`);
  }catch(error){showToast(error.message)}
}

function clearRegistrationErrors() {
  const form=$('#facultyAccountForm');
  form.querySelectorAll('[data-registration-error]').forEach((node)=>{node.textContent=''});
  form.querySelectorAll('input').forEach((input)=>{input.removeAttribute('aria-invalid')});
  $('#facultyRegistrationError').textContent='';
}

async function createFacultyAccount() {
  const form=$('#facultyAccountForm');
  const submit=form.querySelector('button[type="submit"]');
  if (submit.disabled || !requireAdministrator('create faculty accounts')) return;
  clearRegistrationErrors();
  let firstInvalid;
  const fields={};
  form.querySelectorAll('input[name]').forEach((input)=>{
    if(input.name!=='temporaryPassword')input.value=input.value.trim();
    fields[input.name]=input.value;
    if(!input.checkValidity()){
      input.setAttribute('aria-invalid','true');
      form.querySelector(`[data-registration-error="${input.name}"]`).textContent=input.validationMessage;
      firstInvalid ||= input;
    }
  });
  if(firstInvalid){firstInvalid.focus();return}
  fields.facultyId=fields.facultyId.toUpperCase();
  const label=submit.textContent;
  submit.disabled=true;submit.textContent='Creating login—';
  let created=false;
  try{
    await authService.createFaculty(fields);
    created=true;
  }catch(error){
    const details=error.details?.fieldErrors?.body||[];
    $('#facultyRegistrationError').textContent=[error.message,...details].join(' ');
  }finally{submit.disabled=false;submit.textContent=label}
  if(!created)return;
  closeFacultyAccountModal();
  form.reset();
  showToast(`Faculty login ${fields.facultyId} created. Share the temporary password privately.`);
  window.dispatchEvent(new CustomEvent('faculty-account-created',{detail:{facultyId:fields.facultyId}}));
  // A refresh failure must not invite a second registration of an already-created account.
  try{
    [facultyProfiles,facultyAccounts]=await Promise.all([facultyService.list().then((items)=>items.map(flattenFaculty)),authService.listFacultyAccounts()]);
    renderFaculty();renderUserAccounts();updateCounts();updateDashboard();
  }catch{showToast('Faculty login created. Reload the page to refresh the faculty list.')}
}

function openCreateMenu() { $('#createMenu').classList.add('open'); $('#createMenu').setAttribute('aria-hidden','false'); document.body.classList.add('no-scroll'); }
function closeCreateMenu() { $('#createMenu').classList.remove('open'); $('#createMenu').setAttribute('aria-hidden','true'); document.body.classList.remove('no-scroll'); }
function openSidebar(){ $('#cmsSidebar').classList.add('open'); $('#sidebarShade').classList.add('open'); document.body.classList.add('no-scroll'); }
function closeSidebar(){ $('#cmsSidebar').classList.remove('open'); $('#sidebarShade').classList.remove('open'); document.body.classList.remove('no-scroll'); }

const now = new Date(); $('#todayDate').textContent = now.getDate(); $('#todayMonth').textContent = new Intl.DateTimeFormat('en-IN',{month:'short',year:'numeric'}).format(now);
updateCounts(); updateDashboard(); renderUserAccounts();
verifyAdministratorSession();

$$('[data-view]').forEach((button)=>button.addEventListener('click',()=>showView(button.dataset.view)));
$$('[data-admin-nav-toggle]').forEach((button)=>button.addEventListener('click',()=>{
  const group=button.closest('[data-admin-nav-group]');
  const willOpen=!group.classList.contains('open');
  group.classList.toggle('open',willOpen);
  button.setAttribute('aria-expanded',String(willOpen));
}));
$('#globalCreate').addEventListener('click',openCreateMenu); $('#globalSearch').addEventListener('click',()=>{showView('notices');setTimeout(()=>$('#collectionSearch').focus(),50)}); $('#viewSite').addEventListener('click',()=>window.open('../index.html','_blank','noopener'));
$('#dashboardPublishNotice').addEventListener('click',()=>openContentDrawer('notices'));
$('#dashboardManageNotices').addEventListener('click',()=>showView('notices'));
window.addEventListener('admin:manage-research-records',(event)=>{
  showView('documents');
  const category=event.detail?.category;
  if(category&&typeConfig.documents.categories.includes(category)){$('#categoryFilter').value=category;renderCollection()}
});
$('#homepageSettingsForm').addEventListener('submit',saveHomepageSettings);
$('#addHomepageOutcome').addEventListener('click',addHomepageOutcome);
$('#homepageOutcomeEditors').addEventListener('click',(event)=>{const button=event.target.closest('[data-remove-homepage-outcome]');if(!button)return;button.closest('[data-homepage-outcome]')?.remove()});
$$('[data-create-type]').forEach((button)=>button.addEventListener('click',()=>{closeCreateMenu();openContentDrawer(button.dataset.createType)})); $$('[data-close-create-menu]').forEach((button)=>button.addEventListener('click',closeCreateMenu));
$('#collectionCreate').addEventListener('click',()=>openContentDrawer(currentType)); $('#emptyCreate').addEventListener('click',()=>openContentDrawer(currentType));
$('#collectionSearch').addEventListener('input',renderCollection); $('#statusFilter').addEventListener('change',renderCollection); $('#categoryFilter').addEventListener('change',renderCollection);
$('#selectAll').addEventListener('change',(event)=>{filteredItems().forEach((item)=>event.target.checked?selectedIds.add(item.id):selectedIds.delete(item.id));renderCollection()});
$('#bulkPublish').addEventListener('click',()=>bulkSet('published')); $('#bulkDraft').addEventListener('click',()=>bulkSet('draft')); $('#bulkDelete').addEventListener('click',async()=>{if(!confirm(`Delete ${selectedIds.size} selected item(s)?`))return;try{const selected=store[currentType].filter((item)=>selectedIds.has(item.id));if(currentType==='placements')await Promise.all(selected.map((item)=>placementService.remove(item.id)));else await Promise.all(selected.map((item)=>contentService.remove(item.id)));store[currentType]=store[currentType].filter((item)=>!selectedIds.has(item.id));selectedIds.clear();updateDashboard();updateCounts();renderCollection();showToast('Selected content deleted.')}catch(error){showToast(error.message)}});
$$('[data-close-drawer]').forEach((button)=>button.addEventListener('click',closeContentDrawer)); $('#contentUploadZone').addEventListener('click',()=>$('#contentFile').click()); $('#contentFile').addEventListener('change',(event)=>readUpload(event.target.files[0],(file)=>{pendingFile=file;renderAttachedFile()}));
$$('input[name="placementSource"]').forEach((input)=>input.addEventListener('change',()=>setPlacementSource(input.value)));
$('#placementPdfInput').addEventListener('change',(event)=>{const file=event.target.files[0];if(!file)return;if(file.type!=='application/pdf'){showToast('Placement documents must be PDF files.');event.target.value='';return}if(file.size>10*1024*1024){showToast('Placement PDFs must be 10 MB or smaller.');event.target.value='';return}pendingPlacementPdf={name:file.name,type:file.type,size:file.size,raw:file};renderPlacementPdf()});
$('#contentForm').addEventListener('submit',(event)=>{event.preventDefault();saveContent('published')}); $('#saveDraft').addEventListener('click',()=>saveContent('draft')); $('#deleteCurrent').addEventListener('click',async()=>{const id=$('#editingId').value;if(!id||!confirm('Delete this content permanently?'))return;try{if(currentType==='placements')await placementService.remove(id);else await contentService.remove(id);store[currentType]=store[currentType].filter((item)=>item.id!==id);closeContentDrawer();showView(currentType);showToast('Content deleted.')}catch(error){showToast(error.message)}});
$('#addFaculty').addEventListener('click',openFacultyAccountModal); $('#facultyEmptyAdd').addEventListener('click',openFacultyAccountModal); $$('[data-close-faculty]').forEach((button)=>button.addEventListener('click',closeFacultyDrawer));
$('#facultyAdminForm').addEventListener('submit',(event)=>{event.preventDefault();approveFacultyProfile()});
$('#deleteFacultyProfile').addEventListener('click',deleteFacultyProfile);
$('#inviteUser').addEventListener('click',openFacultyAccountModal); $('#facultyAccountForm').addEventListener('submit',async(event)=>{event.preventDefault();await createFacultyAccount()}); $$('[data-close-account]').forEach((button)=>button.addEventListener('click',closeFacultyAccountModal)); $('#toggleFacultyPassword').addEventListener('click',()=>{const input=$('#newFacultyPassword');input.type=input.type==='password'?'text':'password';$('#toggleFacultyPassword').textContent=input.type==='password'?'Show':'Hide'}); $('#openSidebar').addEventListener('click',openSidebar); $('#closeSidebar').addEventListener('click',closeSidebar); $('#sidebarShade').addEventListener('click',closeSidebar);
$('#facultyAccountRows').addEventListener('click',(event)=>{
  const resetButton=event.target.closest('[data-reset-faculty-password]');
  if(resetButton)openFacultyPasswordReset(resetButton.dataset.resetFacultyPassword);
  const accessButton=event.target.closest('[data-notice-access]');
  if(accessButton)setFacultyNoticeAccess(accessButton.dataset.noticeAccess,accessButton.dataset.allowed==='true');
  const statusButton=event.target.closest('[data-account-status]');
  if(statusButton)authService.setFacultyStatus(statusButton.dataset.accountStatus,statusButton.dataset.status).then((updated)=>{const account=facultyAccounts.find((item)=>item.facultyId===updated.facultyId);if(account)account.status=updated.status;renderUserAccounts();showToast(`${updated.facultyId} is now ${updated.status}.`)}).catch((error)=>showToast(error.message));
});
$('#facultyPasswordResetForm').addEventListener('submit',async(event)=>{event.preventDefault();await resetFacultyPassword()});
$$('[data-close-password-reset]').forEach((button)=>button.addEventListener('click',closeFacultyPasswordReset));
$('#toggleResetFacultyPassword').addEventListener('click',()=>{const input=$('#resetFacultyPassword');input.type=input.type==='password'?'text':'password';$('#toggleResetFacultyPassword').textContent=input.type==='password'?'Show':'Hide'});
$('#adminLogout').addEventListener('click',async(event)=>{
  const button=event.currentTarget;
  button.disabled=true;
  button.textContent='Signing out—';
  try {
    await authService.logout();
  } catch {
    // Clear the browser-side session even if the API is temporarily unavailable.
  } finally {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.replace('../index.html');
  }
});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){closeContentDrawer();closeFacultyDrawer();closeFacultyAccountModal();closeFacultyPasswordReset();closeCreateMenu();closeSidebar()}if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showView('notices');setTimeout(()=>$('#collectionSearch').focus(),50)}});
