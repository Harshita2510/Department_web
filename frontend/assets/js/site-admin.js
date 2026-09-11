import { $, $$, escapeHtml, initials } from './shared/dom.js';
import { formatDate } from './shared/format.js';
import { authService } from './services/auth.service.js';
import { facultyService } from './services/faculty.service.js';
import { placementService } from './services/placement.service.js';
import { contentService } from './services/content.service.js';
import { uploadService } from './services/upload.service.js';
const ADMIN_SESSION_KEY = 'sgsitsAdminSession';
const DATA_KEY = 'sgsitsAdminContent';
const HOME_KEY = 'sgsitsHomepageSettings';
const SETTINGS_KEY = 'sgsitsWebsiteSettings';
const adminSession = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || 'null');
const ADMIN_UPLOAD_COLLECTIONS = new Set(['events', 'documents']);
const API_CONTENT_TYPES={notices:'notice',news:'news',events:'event',documents:'document',media:'media'};

if (adminSession?.role !== 'admin') {
  window.location.replace('../index.html?adminLogin=required');
}

function requireAdministrator(action = 'manage website content') {
  if (adminSession?.role === 'admin') return true;
  showToast(`Administrator permission is required to ${action}.`);
  return false;
}

const typeConfig = {
  notices: { title: 'Notices', singular: 'Notice', description: 'Publish academic, examination, admission and student notices.', categories: ['Academic', 'Examination', 'Admission', 'Student affairs', 'General'] },
  news: { title: 'News & stories', singular: 'News story', description: 'Share institute news, achievements, announcements and campus stories.', categories: ['Institute', 'Department', 'Research', 'Achievement', 'Campus'] },
  events: { title: 'Events', singular: 'Event', description: 'Manage seminars, workshops, conferences and student activities.', categories: ['Workshop', 'Seminar', 'Conference', 'Students', 'Cultural'] },
  placements: { title: 'Placement sheets', singular: 'Placement sheet', description: 'Publish a year-wise archive by entering an academic year and its public sheet link.', categories: ['Placement sheet'] },
  documents: { title: 'Documents', singular: 'Document', description: 'Upload syllabi, calendars, forms, reports, policies and official PDFs.', categories: ['Academic', 'NIRF', 'IQAC', 'Policy', 'Form', 'Report'] },
  media: { title: 'Media library', singular: 'Media asset', description: 'Upload and organise approved website images and files.', categories: ['Image', 'Document', 'Video', 'Other'] }
};

const starterData = {
  notices: [
    { id: crypto.randomUUID(), title: 'Academic registration and semester commencement information', category: 'Academic', date: '2026-08-20', summary: 'Academic registration information for students.', body: '', status: 'published', featured: true, file: null, updatedAt: new Date('2026-08-20').toISOString() },
    { id: crypto.randomUUID(), title: 'Orientation schedule for newly admitted students', category: 'Student affairs', date: '2026-08-18', summary: 'Orientation and induction schedule.', body: '', status: 'published', featured: false, file: null, updatedAt: new Date('2026-08-18').toISOString() }
  ],
  news: [], events: [], placements: [], documents: [], media: []
};

let store = loadJson(DATA_KEY, starterData);
Object.keys(typeConfig).forEach((type) => { if (!Array.isArray(store[type])) store[type] = []; });
let currentType = 'notices';
let selectedIds = new Set();
let pendingFile = null;
let editingFacultyPhoto = '';
let toastTimer;
let facultyProfiles=[];

function loadJson(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') }; }
  catch { return structuredClone(fallback); }
}

function saveStore() {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(store));
    updateDashboard();
    updateCounts();
    return true;
  } catch (error) {
    showToast('Browser storage is full. Remove large media files or export your data.');
    return false;
  }
}

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
  return facultyProfiles.map((profile)=>({facultyId:profile.facultyId,status:'active'}));
}

function flattenFaculty(record){
  const draft=record.draft||{};
  return {...draft,id:record._id,facultyId:record.facultyId,photo:draft.photoUrl||'',reviewStatus:record.reviewStatus,isPublished:Boolean(record.approvedSnapshot),submittedAt:record.submittedAt,updatedAt:record.updatedAt};
}

function flattenContent(item){
  return {...item,id:item._id,date:item.displayDate?String(item.displayDate).slice(0,10):'',file:item.asset?{...item.asset,type:item.asset.mimeType,data:item.asset.url}:null};
}

async function hydrateMongoData(){
  try{
    const [profiles,placements,content]=await Promise.all([facultyService.list(),placementService.listAdmin(1),contentService.listAdmin()]);
    facultyProfiles=profiles.map(flattenFaculty);
    ['notices','news','events','documents','media'].forEach((key)=>{store[key]=[]});
    const collectionKeys={notice:'notices',news:'news',event:'events',document:'documents',media:'media'};
    content.forEach((item)=>{const key=collectionKeys[item.type];if(key)store[key].push(flattenContent(item))});
    store.placements=placements.map((item)=>({...item,id:item._id,title:`Placement ${item.academicYear.replace('-', '–')}`,category:'Placement sheet',summary:`Open the placement sheet for academic year ${item.academicYear.replace('-', '–')}.`}));
    updateCounts();updateDashboard();renderUserAccounts();if(currentType==='placements')renderCollection();
  }catch(error){showToast(error.message);if(/Authentication|session/i.test(error.message))setTimeout(()=>window.location.replace('../index.html?adminLogin=required'),900)}
}

function allContent() {
  return Object.entries(store).flatMap(([type, items]) => items.map((item) => ({ ...item, type })));
}

function updateCounts() {
  Object.keys(typeConfig).forEach((type) => $$(`[data-count="${type}"]`).forEach((node) => node.textContent = store[type].length));
  $$('[data-count="faculty"]').forEach((node) => node.textContent = getFacultyProfiles().length);
}

function storageSize() {
  let bytes = 0;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    bytes += (key.length + (localStorage.getItem(key) || '').length) * 2;
  }
  return bytes;
}

function updateDashboard() {
  const content = allContent();
  const faculty = getFacultyProfiles();
  $('#publishedStat').textContent = content.filter((item) => item.status === 'published').length + faculty.filter((item) => item.isPublished).length;
  $('#draftStat').textContent = content.filter((item) => item.status === 'draft').length;
  $('#submissionStat').textContent = faculty.filter((item) => item.reviewStatus === 'submitted').length;
  $('#mediaStat').textContent = store.media.length + content.filter((item) => item.file).length;
  const recent = content.sort((a,b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 5);
  $('#recentActivity').innerHTML = recent.length ? recent.map((item) => `<div class="activity-item"><span>${typeConfig[item.type]?.singular?.[0] || 'C'}</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(typeConfig[item.type].title)} · ${escapeHtml(item.status)}</small></div><time>${formatDate(item.updatedAt)}</time></div>`).join('') : '<div class="empty-mini">No content activity yet.</div>';
  const submissions = faculty.filter((item) => item.reviewStatus === 'submitted').slice(0, 4);
  $('#submissionPreview').innerHTML = submissions.length ? submissions.map((item) => `<div class="submission-item"><span>${initials(item.fullName)}</span><div><b>${escapeHtml(item.fullName || item.email)}</b><small>${escapeHtml(item.department || 'Department not selected')}</small></div><span>Review</span></div>`).join('') : '<div class="empty-mini">No faculty submissions waiting for review.</div>';
  const bytes = storageSize();
  const percent = Math.min(100, Math.round(bytes / (5 * 1024 * 1024) * 100));
  $('#storageMeter').style.setProperty('--used', percent);
  $('#storageUsed').textContent = bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB used` : `${Math.round(bytes / 1024)} KB used`;
}

function showView(viewName) {
  $$('.cms-view').forEach((view) => view.classList.remove('active'));
  $$('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === viewName));
  let view;
  if (typeConfig[viewName]) {
    currentType = viewName;
    view = $('#collectionView');
    setupCollection();
  } else {
    view = $(`#${viewName}View`) || $('#dashboardView');
    if (viewName === 'faculty') renderFaculty();
  }
  view.classList.add('active');
  $('#viewTitle').textContent = view.dataset.title === 'Content' ? typeConfig[currentType].title : view.dataset.title;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeSidebar();
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
  return store[currentType].filter((item) => (!query || `${item.title} ${item.summary} ${item.category}`.toLowerCase().includes(query)) && (status === 'all' || item.status === status) && (category === 'all' || item.category === category));
}

function renderCollection() {
  const items = filteredItems();
  $('#contentRows').innerHTML = items.map((item) => `<tr>
    <td><input type="checkbox" data-select-id="${item.id}" ${selectedIds.has(item.id) ? 'checked' : ''} aria-label="Select ${escapeHtml(item.title)}"></td>
    <td class="content-title"><b>${escapeHtml(item.title)}</b><small>${item.file ? `Attachment: ${escapeHtml(item.file.name)}` : escapeHtml(item.summary || 'No summary')}</small></td>
    <td>${escapeHtml(item.category || '—')}</td><td>${formatDate(item.updatedAt || item.date)}</td>
    <td><span class="status-pill ${item.status === 'draft' ? 'draft' : ''}">${escapeHtml(item.status)}</span></td>
    <td><div class="row-actions"><button type="button" data-edit-id="${item.id}" aria-label="Edit">✎</button><button type="button" data-toggle-id="${item.id}" aria-label="Toggle publish status">${item.status === 'published' ? '↓' : '↑'}</button></div></td>
  </tr>`).join('');
  $('#tableEmpty').classList.toggle('show', items.length === 0);
  $('.content-table').style.display = items.length ? 'table' : 'none';
  $$('[data-select-id]').forEach((checkbox) => checkbox.addEventListener('change', () => { checkbox.checked ? selectedIds.add(checkbox.dataset.selectId) : selectedIds.delete(checkbox.dataset.selectId); updateBulkBar(); }));
  $$('[data-edit-id]').forEach((button) => button.addEventListener('click', () => openContentDrawer(currentType, button.dataset.editId)));
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
  $('#drawerKicker').textContent = item ? `Edit ${config.singular.toLowerCase()}` : `Create ${config.singular.toLowerCase()}`;
  $('#drawerTitle').textContent = item?.title || `New ${config.singular.toLowerCase()}`;
  $('#editingId').value = item?.id || '';
  $('#contentTitle').value = item?.title || '';
  $('#genericContentFields').hidden = isPlacement;
  $('#placementFields').hidden = !isPlacement;
  $('#contentTitle').required = !isPlacement;
  $('#placementYear').required = isPlacement;
  $('#placementSheetUrl').required = isPlacement;
  $('#placementYear').value = item?.academicYear || (item?.title || '').replace(/^Placement\s+/i, '').replace(/–/g, '-');
  $('#placementSheetUrl').value = item?.sheetUrl || '';
  $('#contentCategory').innerHTML = config.categories.map((category) => `<option ${item?.category === category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('');
  $('#contentDate').value = item?.date || new Date().toISOString().slice(0, 10);
  $('#contentSummary').value = item?.summary || '';
  $('#contentBody').value = item?.body || '';
  $('#contentFeatured').checked = Boolean(item?.featured);
  pendingFile = item?.file || null;
  const uploadRules = {
    events: { accept: 'image/jpeg,image/png,image/webp,application/pdf', help: 'Event image or PDF · Maximum 2 MB in this prototype' },
    documents: { accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv', help: 'PDF, Word, Excel or CSV · Maximum 2 MB' }
  };
  const uploadRule = uploadRules[type] || { accept: '', help: 'Click to choose a file · Maximum 2 MB in this prototype' };
  $('#contentFile').accept = uploadRule.accept;
  $('#uploadHelp').textContent = uploadRule.help;
  $('#uploadPermissionText').textContent = ADMIN_UPLOAD_COLLECTIONS.has(type) ? `Only the website administrator can upload ${config.title.toLowerCase()}.` : 'Only website administrators can upload this attachment.';
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
  $('#contentForm').reset(); pendingFile = null;
}

function renderAttachedFile() {
  const box = $('#attachedFile');
  box.hidden = !pendingFile;
  box.innerHTML = pendingFile ? `<strong>${escapeHtml(pendingFile.name)}</strong> · ${Math.ceil(pendingFile.size / 1024)} KB <button type="button" id="removeAttached">Remove</button>` : '';
  $('#removeAttached')?.addEventListener('click', () => { pendingFile = null; renderAttachedFile(); });
}

function readUpload(file, callback) {
  if (!requireAdministrator('upload files')) return;
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('This prototype accepts files up to 2 MB.'); return; }
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
  const id = $('#editingId').value;
  const existing = id ? store[currentType].find((entry) => entry.id === id) : null;
  let entry;
  if (currentType === 'placements') {
    const academicYear = $('#placementYear').value.trim().replace(/[–—]/g, '-');
    if (!/^\d{4}-\d{2}$/.test(academicYear)) { showToast('Enter the academic year in YYYY-YY format, for example 2025-26.'); $('#placementYear').focus(); return; }
    const [startYear, shortEndYear] = academicYear.split('-');
    if ((Number(startYear) + 1) % 100 !== Number(shortEndYear)) { showToast('The placement year must cover consecutive years, for example 2025-26.'); $('#placementYear').focus(); return; }
    if (store.placements.some((item) => item.id !== id && item.academicYear === academicYear)) { showToast(`A placement sheet for ${academicYear} already exists.`); $('#placementYear').focus(); return; }
    let sheetUrl;
    try { sheetUrl = new URL($('#placementSheetUrl').value.trim()); } catch { showToast('Enter a valid public sheet link.'); $('#placementSheetUrl').focus(); return; }
    if (sheetUrl.protocol !== 'https:') { showToast('The public sheet link must begin with https://.'); $('#placementSheetUrl').focus(); return; }
    const displayYear = `${startYear}–${shortEndYear}`;
    entry = { id: id || crypto.randomUUID(), title: `Placement ${displayYear}`, academicYear, sheetUrl: sheetUrl.href, category: 'Placement sheet', date: '', summary: `Open the placement sheet for academic year ${displayYear}.`, body: '', featured: false, file: null, status, updatedAt: new Date().toISOString() };
  } else {
    entry = {
      id: id || crypto.randomUUID(), title: $('#contentTitle').value.trim(), category: $('#contentCategory').value,
      date: $('#contentDate').value, summary: $('#contentSummary').value.trim(), body: $('#contentBody').value.trim(),
      featured: $('#contentFeatured').checked, file: pendingFile, status, updatedAt: new Date().toISOString()
    };
  }
  if(currentType==='placements'){
    try{const saved=id?await placementService.update(id,{academicYear:entry.academicYear,sheetUrl:entry.sheetUrl,status}):await placementService.create({academicYear:entry.academicYear,sheetUrl:entry.sheetUrl,status});entry={...entry,...saved,id:saved._id};}catch(error){showToast(error.message);return}
  }
  else{
    try{
      let asset=existing?.asset||null;
      if(pendingFile?.raw)asset=pendingFile.type.startsWith('image/')
        ? await uploadService.uploadImage(pendingFile.raw,currentType)
        : await uploadService.upload(pendingFile.raw);
      const payload={type:API_CONTENT_TYPES[currentType],title:entry.title,category:entry.category,summary:entry.summary,body:entry.body,displayDate:entry.date||undefined,featured:entry.featured,status};
      if(asset)payload.asset=asset;
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
  const profiles = getFacultyProfiles();
  $('#facultyGrid').innerHTML = profiles.map((profile) => `<article class="faculty-card"><div class="faculty-card-top"><div class="faculty-photo" style="${profile.photo ? `background-image:url('${profile.photo}')` : ''}">${profile.photo ? '' : initials(profile.fullName || profile.facultyId)}</div><span class="faculty-state ${profile.isPublished ? 'published' : ''}">${profile.reviewStatus === 'submitted' ? 'Review needed' : profile.isPublished ? 'Published' : 'Profile incomplete'}</span></div><h3>${escapeHtml(profile.fullName || 'Profile not completed')}</h3><p>${escapeHtml(profile.designation || `Faculty ID: ${profile.facultyId}`)}</p><span>${escapeHtml(profile.department || profile.email || 'Waiting for faculty details')}</span><footer><small>Updated ${formatDate(profile.updatedAt)}</small><button type="button" data-edit-faculty="${encodeURIComponent(profile.facultyId)}">Review &amp; edit →</button></footer></article>`).join('');
  $('#facultyEmpty').classList.toggle('show', profiles.length === 0);
  $$('[data-edit-faculty]').forEach((button) => button.addEventListener('click', () => openFacultyDrawer(decodeURIComponent(button.dataset.editFaculty))));
}

function openFacultyDrawer(facultyId = '') {
  if (!requireAdministrator('manage faculty profiles')) return;
  const profile = facultyProfiles.find((item)=>item.facultyId===facultyId.toUpperCase())||{};
  $('#facultyEmailKey').value = profile.id||'';
  $('#facultyIdReview').value = profile.facultyId || facultyId;
  $('#facultyEmail').value = profile.email || '';
  $('#facultyName').value = profile.fullName || '';
  $('#facultyDesignation').value = profile.designation || '';
  $('#facultyDepartment').value = profile.department || '';
  $('#facultyBio').value = profile.bio || '';
  editingFacultyPhoto = profile.photo || '';
  $('#deleteFaculty').hidden = !profile.id;
  $('#facultySubmissionData').innerHTML = profile.reviewStatus === 'submitted' ? `<strong>Teacher submission waiting</strong><br>Submitted ${formatDate(profile.submittedAt, true)}. Review the information and publish when approved.` : 'No pending teacher submission. Admin changes can still be saved as a draft or published.';
  renderAdminFacultyPhoto();
  $('#facultyDrawer').classList.add('open'); $('#facultyDrawer').setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll');
}

function renderAdminFacultyPhoto() {
  const photo = $('#adminFacultyPhoto');
  photo.style.backgroundImage = editingFacultyPhoto ? `url("${editingFacultyPhoto}")` : '';
  $('#adminFacultyInitials').textContent = initials($('#facultyName').value);
  $('#adminFacultyInitials').style.visibility = editingFacultyPhoto ? 'hidden' : '';
}

function closeFacultyDrawer() {
  $('#facultyDrawer').classList.remove('open'); $('#facultyDrawer').setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll'); editingFacultyPhoto = '';
}

async function saveFaculty(publish) {
  if (!requireAdministrator(`${publish ? 'publish' : 'edit'} faculty profiles`)) return;
  if (!$('#facultyAdminForm').reportValidity()) return;
  const profileId = $('#facultyEmailKey').value;
  const facultyId = $('#facultyIdReview').value.trim().toUpperCase();
  const email = $('#facultyEmail').value.trim().toLowerCase();
  if (email && !email.endsWith('@sgsits.ac.in')) { showToast('Faculty email must use the @sgsits.ac.in domain.'); return; }
  const draft={email,fullName:$('#facultyName').value.trim(),designation:$('#facultyDesignation').value.trim(),department:$('#facultyDepartment').value.trim(),bio:$('#facultyBio').value.trim()};
  try{let record=await facultyService.updateByAdmin(profileId,draft);if(publish)record=await facultyService.approve(profileId);const index=facultyProfiles.findIndex((item)=>item.id===profileId);if(index>=0)facultyProfiles[index]=flattenFaculty(record);closeFacultyDrawer();renderFaculty();renderUserAccounts();updateDashboard();updateCounts();showToast(publish?'Faculty profile approved and published.':'Faculty profile saved as draft.')}catch(error){showToast(error.message)}
}

function setupHomepage() {
  const defaults = { eyebrow:'Engineering excellence since 1952', headline:'Learn deeply. Build boldly. Lead responsibly.', intro:'Where rigorous engineering, meaningful research and an energetic student community come together in the heart of Indore.', button:'Explore programmes', link:'#programmes', sections:{ about:true, programmes:true, departments:true, events:true, notices:true, research:true, placements:true, people:true, admissions:true, campus:true } };
  const home = loadJson(HOME_KEY, defaults); home.sections = { ...defaults.sections, ...(home.sections || {}) };
  $('#heroEyebrow').value = home.eyebrow; $('#heroHeadline').value = home.headline; $('#heroIntro').value = home.intro; $('#heroButton').value = home.button; $('#heroLink').value = home.link;
  $('#sectionToggles').innerHTML = Object.entries(home.sections).map(([key,value]) => `<div class="toggle-row"><div><b>${key[0].toUpperCase()+key.slice(1)}</b><small>Show this section on the public homepage</small></div><label class="switch"><input type="checkbox" data-section="${key}" ${value ? 'checked' : ''}><span></span></label></div>`).join('');
}

function saveHomepage() {
  const sections = {}; $$('[data-section]').forEach((input) => { sections[input.dataset.section] = input.checked; });
  localStorage.setItem(HOME_KEY, JSON.stringify({ eyebrow:$('#heroEyebrow').value, headline:$('#heroHeadline').value, intro:$('#heroIntro').value, button:$('#heroButton').value, link:$('#heroLink').value, sections }));
  showToast('Homepage settings saved.');
}

function setupSettings() {
  const settings = loadJson(SETTINGS_KEY, { name:'Shri G. S. Institute of Technology & Science', email:'director@sgsits.ac.in', phone:'+91 731 2544415', address:'23, Sir M. Visvesvaraya Marg, Indore, Madhya Pradesh 452003' });
  $('#settingName').value=settings.name; $('#settingEmail').value=settings.email; $('#settingPhone').value=settings.phone; $('#settingAddress').value=settings.address;
}

function renderUserAccounts() {
  const accounts = getFacultyAccounts();
  $('#facultyAccountRows').innerHTML = accounts.length ? accounts.map((account) => `<div class="user-row"><span><b>${escapeHtml(account.facultyId)}</b><small>Faculty login</small></span><span>Faculty member</span><span><i></i> ${account.status === 'inactive' ? 'Inactive' : 'Active'}</span><span>Own profile only</span></div>`).join('') : '<div class="user-row"><span><b>No faculty logins</b><small>Create the first Faculty ID</small></span><span>—</span><span>—</span><span>—</span></div>';
}

function openFacultyAccountModal() {
  if (!requireAdministrator('create faculty accounts')) return;
  $('#facultyAccountForm').reset();
  $('#newFacultyPassword').type = 'password';
  $('#toggleFacultyPassword').textContent = 'Show';
  $('#facultyAccountModal').classList.add('open');
  $('#facultyAccountModal').setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  setTimeout(() => $('#newFacultyId').focus(), 80);
}

function closeFacultyAccountModal() {
  $('#facultyAccountModal').classList.remove('open');
  $('#facultyAccountModal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}

async function createFacultyAccount() {
  if (!requireAdministrator('create faculty accounts') || !$('#facultyAccountForm').reportValidity()) return;
  const facultyId = $('#newFacultyId').value.trim().toUpperCase();
  const password = $('#newFacultyPassword').value;
  if (!/^[A-Z0-9-]+$/.test(facultyId)) { showToast('Faculty ID may contain only letters, numbers and hyphens.'); return; }
  try{await authService.createFaculty(facultyId,password);facultyProfiles=(await facultyService.list()).map(flattenFaculty);closeFacultyAccountModal();renderFaculty();renderUserAccounts();updateCounts();updateDashboard();showToast(`Faculty profile ${facultyId} created in MongoDB. Give the temporary password privately to the faculty member.`)}catch(error){showToast(error.message)}
}

function exportData() {
  const faculty = getFacultyProfiles().map(({storageKey,...profile}) => profile);
  const payload = JSON.stringify({ exportedAt:new Date().toISOString(), content:store, homepage:JSON.parse(localStorage.getItem(HOME_KEY)||'null'), settings:JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null'), faculty }, null, 2);
  const blob = new Blob([payload], { type:'application/json' }); const link = document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`sgsits-cms-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href); showToast('CMS data exported.');
}

function openCreateMenu() { $('#createMenu').classList.add('open'); $('#createMenu').setAttribute('aria-hidden','false'); document.body.classList.add('no-scroll'); }
function closeCreateMenu() { $('#createMenu').classList.remove('open'); $('#createMenu').setAttribute('aria-hidden','true'); document.body.classList.remove('no-scroll'); }
function openSidebar(){ $('#cmsSidebar').classList.add('open'); $('#sidebarShade').classList.add('open'); document.body.classList.add('no-scroll'); }
function closeSidebar(){ $('#cmsSidebar').classList.remove('open'); $('#sidebarShade').classList.remove('open'); document.body.classList.remove('no-scroll'); }

const now = new Date(); $('#todayDate').textContent = now.getDate(); $('#todayMonth').textContent = new Intl.DateTimeFormat('en-IN',{month:'short',year:'numeric'}).format(now);
updateCounts(); updateDashboard(); setupHomepage(); setupSettings(); renderUserAccounts();
hydrateMongoData();

$$('[data-view]').forEach((button)=>button.addEventListener('click',()=>showView(button.dataset.view)));
$$('[data-view-jump]').forEach((button)=>button.addEventListener('click',()=>showView(button.dataset.viewJump)));
$$('[data-quick-create]').forEach((button)=>button.addEventListener('click',()=>openContentDrawer(button.dataset.quickCreate)));
$('#globalCreate').addEventListener('click',openCreateMenu); $('#globalSearch').addEventListener('click',()=>{showView('notices');setTimeout(()=>$('#collectionSearch').focus(),50)}); $('#viewSite').addEventListener('click',()=>window.open('../index.html','_blank','noopener'));
$$('[data-create-type]').forEach((button)=>button.addEventListener('click',()=>{closeCreateMenu();openContentDrawer(button.dataset.createType)})); $$('[data-close-create-menu]').forEach((button)=>button.addEventListener('click',closeCreateMenu));
$('#collectionCreate').addEventListener('click',()=>openContentDrawer(currentType)); $('#emptyCreate').addEventListener('click',()=>openContentDrawer(currentType));
$('#collectionSearch').addEventListener('input',renderCollection); $('#statusFilter').addEventListener('change',renderCollection); $('#categoryFilter').addEventListener('change',renderCollection);
$('#selectAll').addEventListener('change',(event)=>{filteredItems().forEach((item)=>event.target.checked?selectedIds.add(item.id):selectedIds.delete(item.id));renderCollection()});
$('#bulkPublish').addEventListener('click',()=>bulkSet('published')); $('#bulkDraft').addEventListener('click',()=>bulkSet('draft')); $('#bulkDelete').addEventListener('click',async()=>{if(!confirm(`Delete ${selectedIds.size} selected item(s)?`))return;try{const selected=store[currentType].filter((item)=>selectedIds.has(item.id));if(currentType==='placements')await Promise.all(selected.map((item)=>placementService.remove(item.id)));else await Promise.all(selected.map((item)=>contentService.remove(item.id)));store[currentType]=store[currentType].filter((item)=>!selectedIds.has(item.id));selectedIds.clear();updateDashboard();updateCounts();renderCollection();showToast('Selected content deleted.')}catch(error){showToast(error.message)}});
$$('[data-close-drawer]').forEach((button)=>button.addEventListener('click',closeContentDrawer)); $('#contentUploadZone').addEventListener('click',()=>$('#contentFile').click()); $('#contentFile').addEventListener('change',(event)=>readUpload(event.target.files[0],(file)=>{pendingFile=file;renderAttachedFile()}));
$('#contentForm').addEventListener('submit',(event)=>{event.preventDefault();saveContent('published')}); $('#saveDraft').addEventListener('click',()=>saveContent('draft')); $('#deleteCurrent').addEventListener('click',async()=>{const id=$('#editingId').value;if(!id||!confirm('Delete this content permanently?'))return;try{if(currentType==='placements')await placementService.remove(id);else await contentService.remove(id);store[currentType]=store[currentType].filter((item)=>item.id!==id);closeContentDrawer();showView(currentType);showToast('Content deleted.')}catch(error){showToast(error.message)}});
$('#addFaculty').addEventListener('click',openFacultyAccountModal); $('#facultyEmptyAdd').addEventListener('click',openFacultyAccountModal); $$('[data-close-faculty]').forEach((button)=>button.addEventListener('click',closeFacultyDrawer)); $('#facultyName').addEventListener('input',renderAdminFacultyPhoto);
$('#adminPhotoInput').addEventListener('change',(event)=>readUpload(event.target.files[0],(file)=>{if(!file.type.startsWith('image/')){showToast('Faculty photographs must be image files.');return}editingFacultyPhoto=file.data;renderAdminFacultyPhoto()})); $('#adminPhotoRemove').addEventListener('click',()=>{editingFacultyPhoto='';renderAdminFacultyPhoto()});
$('#facultyAdminForm').addEventListener('submit',(event)=>{event.preventDefault();saveFaculty(true)}); $('#saveFacultyDraft').addEventListener('click',()=>saveFaculty(false)); $('#deleteFaculty').addEventListener('click',async()=>{const id=$('#facultyEmailKey').value;if(!id||!confirm('Delete this faculty profile and its login?'))return;try{await facultyService.remove(id);facultyProfiles=facultyProfiles.filter((profile)=>profile.id!==id);closeFacultyDrawer();renderFaculty();renderUserAccounts();updateCounts();updateDashboard();showToast('Faculty profile and login deleted.')}catch(error){showToast(error.message)}});
$('#saveHomepage').addEventListener('click',saveHomepage); $('#saveSettings').addEventListener('click',()=>{localStorage.setItem(SETTINGS_KEY,JSON.stringify({name:$('#settingName').value,email:$('#settingEmail').value,phone:$('#settingPhone').value,address:$('#settingAddress').value}));showToast('Website settings saved.')}); $('#exportData').addEventListener('click',exportData);
$('#inviteUser').addEventListener('click',openFacultyAccountModal); $('#facultyAccountForm').addEventListener('submit',async(event)=>{event.preventDefault();await createFacultyAccount()}); $$('[data-close-account]').forEach((button)=>button.addEventListener('click',closeFacultyAccountModal)); $('#toggleFacultyPassword').addEventListener('click',()=>{const input=$('#newFacultyPassword');input.type=input.type==='password'?'text':'password';$('#toggleFacultyPassword').textContent=input.type==='password'?'Show':'Hide'}); $('#openSidebar').addEventListener('click',openSidebar); $('#closeSidebar').addEventListener('click',closeSidebar); $('#sidebarShade').addEventListener('click',closeSidebar);
$('#adminLogout').addEventListener('click',async(event)=>{
  const button=event.currentTarget;
  button.disabled=true;
  button.textContent='Signing out…';
  try {
    await authService.logout();
  } catch {
    // Clear the browser-side session even if the API is temporarily unavailable.
  } finally {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.replace('../index.html');
  }
});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){closeContentDrawer();closeFacultyDrawer();closeFacultyAccountModal();closeCreateMenu();closeSidebar()}if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showView('notices');setTimeout(()=>$('#collectionSearch').focus(),50)}});
