import { facultyPhotoUrl } from './shared/faculty-photo.js';
import { $, $$ } from './shared/dom.js';
import { authService } from './services/auth.service.js';
import { facultyService } from './services/faculty.service.js';
import { uploadService } from './services/upload.service.js';

const sessionKey = 'sgsitsFacultySession';
const session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');

if (!session?.facultyId || session?.role !== 'faculty') {
  window.location.replace('../index.html?login=required');
}

const facultyId = (session?.facultyId || '').trim().toUpperCase();
const CSE_DEPARTMENT='Computer Science & Engineering';
const defaultProfile = {
  facultyId,
  title: 'Dr.',
  fullName: '',
  designation: '',
  department: CSE_DEPARTMENT,
  email: '',
  phone: '',
  office: '',
  officeHours: '',
  bio: '',
  photo: '',
  scholarUrl: '',
  orcidUrl: '',
  linkedinUrl: '',
  websiteUrl: '',
  qualifications: '',
  highestQualification: '',
  areaOfSpecialisation: '',
  researchInterests: '',
  coursesTaught: '',
  experienceYears: '',
  scholarsSupervised: '',
  researchSummary: '',
  publications: [],
  achievements: [],
  isPublished: false,
  reviewStatus: 'draft',
  updatedAt: '',
  publishedAt: ''
};

let profile = { ...defaultProfile };
profile.facultyId = facultyId;
let saveTimer;
let toastTimer;

const editableFields = [
  'title', 'fullName', 'designation', 'department', 'phone', 'office', 'officeHours', 'bio',
  'scholarUrl', 'orcidUrl', 'linkedinUrl', 'websiteUrl', 'qualifications', 'researchInterests',
  'coursesTaught', 'experienceYears', 'scholarsSupervised', 'researchSummary', 'highestQualification', 'areaOfSpecialisation'
];

function initials(name = '') {
  const value = name.trim() || facultyId;
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'FM';
}

function firstName() {
  const cleanName = profile.fullName.trim().replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, '');
  return cleanName.split(/\s+/)[0] || 'Professor';
}

function commaItems(value = '') {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function formatDate(value) {
  if (!value) return 'Not yet';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function calculateCompletion() {
  const checks = [
    Boolean(profile.fullName.trim()),
    Boolean(profile.designation.trim()),
    profile.experienceYears !== '',
    Boolean(profile.highestQualification.trim()),
    Boolean(profile.areaOfSpecialisation.trim()),
    Boolean(profile.email.trim()),
    Boolean(profile.photo)
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function hasRequiredFields() {
  return Boolean(profile.fullName.trim() && profile.designation.trim() && profile.email.trim() && profile.highestQualification.trim() && profile.areaOfSpecialisation.trim() && profile.experienceYears !== '' && profile.photo);
}

function markSaving(state = 'unsaved') {
  const saveState = $('#saveState');
  saveState.className = `save-state ${state}`;
  saveState.innerHTML = `<i></i> ${state === 'saving' ? 'Saving changes…' : state === 'unsaved' ? 'Unsaved changes' : 'All changes saved'}`;
}

function queueSave() {
  if (profile.reviewStatus === 'approved' || profile.reviewStatus === 'submitted') profile.reviewStatus = 'draft';
  markSaving('unsaved');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveProfile(), 650);
}

function collectFields() {
  editableFields.forEach((fieldId) => {
    const field = $(`#${fieldId}`);
    if (field) profile[fieldId] = field.value;
  });
  profile.email=$('#instituteEmail').value.trim();
}

function apiDraft() {
  const list=(value)=>value.split(/\r?\n|,/).map((item)=>item.trim()).filter(Boolean);
  const number=(value)=>value===''?undefined:Number(value);
  return {
    title:profile.title,fullName:profile.fullName,designation:profile.designation,department:profile.department,email:profile.email,
    phone:profile.phone,office:profile.office,officeHours:profile.officeHours,bio:profile.bio,scholarUrl:profile.scholarUrl,orcidUrl:profile.orcidUrl,
    linkedinUrl:profile.linkedinUrl,websiteUrl:profile.websiteUrl,qualifications:list(profile.qualifications),researchInterests:list(profile.researchInterests),
    coursesTaught:list(profile.coursesTaught),experienceYears:number(profile.experienceYears),scholarsSupervised:number(profile.scholarsSupervised),researchSummary:profile.researchSummary,
    highestQualification:profile.highestQualification,areaOfSpecialisation:profile.areaOfSpecialisation,
    photoUrl:profile.photo,
    publications:profile.publications.map((item)=>({...item,year:number(item.year)})),achievements:profile.achievements.map((item)=>({...item,year:number(item.year)}))
  };
}

function applyApiProfile(record) {
  const draft=record.draft||{};const text=(value,separator='\n')=>Array.isArray(value)?value.join(separator):value||'';
  profile={...defaultProfile,...draft,department:CSE_DEPARTMENT,facultyId:record.facultyId,photo:draft.photoUrl||'',qualifications:text(draft.qualifications),researchInterests:text(draft.researchInterests,', '),coursesTaught:text(draft.coursesTaught,', '),experienceYears:draft.experienceYears??'',scholarsSupervised:draft.scholarsSupervised??'',publications:draft.publications||[],achievements:draft.achievements||[],reviewStatus:record.reviewStatus,isPublished:Boolean(record.approvedSnapshot),updatedAt:record.updatedAt,publishedAt:record.publishedAt||''};
}

async function saveProfile(showConfirmation = false) {
  clearTimeout(saveTimer);
  collectFields();
  markSaving('saving');
  try{const record=await facultyService.updateOwn(apiDraft());applyApiProfile(record);markSaving('saved');populateForms();renderPublications();renderAchievements();renderDashboard();if(showConfirmation)showToast('Your profile changes have been saved to MongoDB.');return record}catch(error){markSaving('unsaved');showToast(error.message);return null}
}

function showToast(message) {
  const toast = $('#portalToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
}

function setAvatar(element, includeFallback = true, width = 156) {
  if (profile.photo) {
    element.style.backgroundImage = `url("${facultyPhotoUrl(profile.photo,width)}")`;
    if (!includeFallback) element.style.color = 'transparent';
    if (includeFallback) {
      const fallback = $('[data-profile-initials]', element);
      if (fallback) fallback.style.visibility = 'hidden';
    }
  } else {
    element.style.backgroundImage = '';
    if (!includeFallback) element.style.color = '';
    if (includeFallback) {
      const fallback = $('[data-profile-initials]', element);
      if (fallback) fallback.style.visibility = '';
    }
  }
}

function renderDashboard() {
  const displayName = profile.fullName.trim() || 'Faculty Member';
  const displayRole = profile.designation.trim() || 'Teacher account';
  const displayDepartment = profile.department || 'Department not selected';
  const profileInitials = initials(displayName);
  const completion = calculateCompletion();

  $$('[data-profile-name]').forEach((element) => element.textContent = displayName);
  $$('[data-profile-first-name]').forEach((element) => element.textContent = firstName());
  $$('[data-profile-role]').forEach((element) => element.textContent = displayRole);
  $$('[data-profile-designation]').forEach((element) => element.textContent = profile.designation || 'Designation not added');
  $$('[data-profile-department]').forEach((element) => element.textContent = displayDepartment);
  $$('[data-profile-initials]').forEach((element) => element.textContent = profileInitials);

  setAvatar($('.summary-avatar'));
  setAvatar($('.sidebar-avatar'), false, 74);
  setAvatar($('#photoPreview'), true, 216);

  $('#completionRing').style.setProperty('--progress', completion);
  $('#completionValue').textContent = `${completion}%`;
  $('#publishCompletion').textContent = `${completion}%`;
  $('#requiredStatus').textContent = hasRequiredFields() ? 'Complete' : 'Incomplete';
  $('#personalStatus').textContent = hasRequiredFields() ? 'Complete' : 'Incomplete';
  $('#personalStatus').classList.toggle('complete', hasRequiredFields());
  $('#publicationMetric').textContent = profile.publications.length;
  $('#achievementMetric').textContent = profile.achievements.length;
  $('#courseMetric').textContent = commaItems(profile.coursesTaught).length;
  $('#lastUpdated').textContent = formatDate(profile.updatedAt);
  $('#settingsEmail').textContent = profile.email || 'Not added';

  const visibilityText = profile.reviewStatus === 'submitted' ? 'In review' : profile.isPublished ? 'Published' : 'Draft';
  const visibilityLabel = $('#visibilityLabel');
  visibilityLabel.innerHTML = `<i></i> ${visibilityText}`;
  visibilityLabel.classList.toggle('published', profile.isPublished);
  $('#settingsVisibility').textContent = visibilityText;
  $('#profileNavStatus').textContent = visibilityText;

  const tasks = [
    { label: 'Add name and designation', done: Boolean(profile.fullName && profile.designation), target: 'profilePanel' },
    { label: 'Add email and optional contact', done: Boolean(profile.email), target: 'profilePanel' },
    { label: 'Add experience, qualification and specialisation', done: profile.experienceYears!==''&&Boolean(profile.highestQualification&&profile.areaOfSpecialisation), target: 'academicPanel' },
    { label: 'Upload your profile photograph', done: Boolean(profile.photo), target: 'profilePanel' }
  ];
  $('#completionTasks').innerHTML = tasks.map((task) => `<div class="completion-task ${task.done ? 'done' : ''}"><i>✓</i><span>${task.label}</span><button type="button" data-go-to="${task.target}" aria-label="Open ${task.label}">→</button></div>`).join('');
  bindGoToButtons();
}

function populateForms() {
  editableFields.forEach((fieldId) => {
    const field = $(`#${fieldId}`);
    if (field) field.value = profile[fieldId] ?? '';
  });
  $('#instituteEmail').value = profile.email || '';
  $('#settingsFacultyId').textContent = facultyId;
  $$('[data-faculty-id]').forEach((field)=>{field.value=facultyId});
  $('#settingsEmail').textContent = profile.email || 'Not added';
  $('#bioCount').textContent = profile.bio.length;
}

function showPanel(panelId) {
  if(session.mustChangePassword&&panelId!=='settingsPanel'){
    showToast('Change your temporary password before opening the profile editor.');
    panelId='settingsPanel';
  }
  $$('.portal-panel').forEach((panel) => panel.classList.toggle('active', panel.id === panelId));
  $$('[data-panel-target]').forEach((button) => button.classList.toggle('active', button.dataset.panelTarget === panelId));
  const activePanel = $(`#${panelId}`);
  $('#panelHeading').textContent = activePanel?.dataset.title || 'Faculty portal';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeSidebar();
}

function bindGoToButtons() {
  $$('[data-go-to]').forEach((button) => {
    button.onclick = () => showPanel(button.dataset.goTo);
  });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function publicationTemplate(item, index) {
  return `<article class="repeat-card" data-publication-index="${index}">
    <div class="repeat-card-head"><div><span class="repeat-card-number">${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(item.title || 'Untitled publication')}</strong></div><button class="delete-repeat" type="button" data-delete-publication="${index}">Remove</button></div>
    <div class="repeat-card-body"><div class="form-grid">
      <label class="field full-field"><span>Publication title <b>*</b></span><input data-publication-field="title" value="${escapeHtml(item.title)}" type="text" placeholder="Title of the paper, book or chapter"></label>
      <label class="field"><span>Type</span><select data-publication-field="type"><option ${item.type === 'Journal article' ? 'selected' : ''}>Journal article</option><option ${item.type === 'Conference paper' ? 'selected' : ''}>Conference paper</option><option ${item.type === 'Book' ? 'selected' : ''}>Book</option><option ${item.type === 'Book chapter' ? 'selected' : ''}>Book chapter</option><option ${item.type === 'Other' ? 'selected' : ''}>Other</option></select></label>
      <label class="field"><span>Publication year</span><input data-publication-field="year" value="${escapeHtml(item.year)}" type="number" min="1952" max="2100" placeholder="2026"></label>
      <label class="field full-field"><span>Journal / conference / publisher</span><input data-publication-field="venue" value="${escapeHtml(item.venue)}" type="text" placeholder="Publication venue"></label>
      <label class="field full-field"><span>DOI or public URL</span><input data-publication-field="url" value="${escapeHtml(item.url)}" type="url" placeholder="https://doi.org/…"></label>
    </div></div>
  </article>`;
}

function achievementTemplate(item, index) {
  return `<article class="repeat-card" data-achievement-index="${index}">
    <div class="repeat-card-head"><div><span class="repeat-card-number">${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(item.title || 'Untitled achievement')}</strong></div><button class="delete-repeat" type="button" data-delete-achievement="${index}">Remove</button></div>
    <div class="repeat-card-body"><div class="form-grid">
      <label class="field full-field"><span>Achievement / award title <b>*</b></span><input data-achievement-field="title" value="${escapeHtml(item.title)}" type="text" placeholder="Name of award, grant or distinction"></label>
      <label class="field"><span>Category</span><select data-achievement-field="category"><option ${item.category === 'Award' ? 'selected' : ''}>Award</option><option ${item.category === 'Research grant' ? 'selected' : ''}>Research grant</option><option ${item.category === 'Professional recognition' ? 'selected' : ''}>Professional recognition</option><option ${item.category === 'Patent' ? 'selected' : ''}>Patent</option><option ${item.category === 'Other' ? 'selected' : ''}>Other</option></select></label>
      <label class="field"><span>Year</span><input data-achievement-field="year" value="${escapeHtml(item.year)}" type="number" min="1952" max="2100" placeholder="2026"></label>
      <label class="field full-field"><span>Description</span><textarea data-achievement-field="description" rows="4" placeholder="Short, verifiable description">${escapeHtml(item.description)}</textarea></label>
    </div></div>
  </article>`;
}

function renderPublications() {
  $('#publicationList').innerHTML = profile.publications.map(publicationTemplate).join('');
  $('#publicationEmpty').classList.toggle('hidden', profile.publications.length > 0);
  $$('[data-publication-field]').forEach((field) => field.addEventListener('input', () => {
    const card = field.closest('[data-publication-index]');
    profile.publications[Number(card.dataset.publicationIndex)][field.dataset.publicationField] = field.value;
    if (field.dataset.publicationField === 'title') $('.repeat-card-head strong', card).textContent = field.value || 'Untitled publication';
    queueSave();
  }));
  $$('[data-delete-publication]').forEach((button) => button.addEventListener('click', () => {
    profile.publications.splice(Number(button.dataset.deletePublication), 1);
    renderPublications();
    queueSave();
  }));
}

function renderAchievements() {
  $('#achievementList').innerHTML = profile.achievements.map(achievementTemplate).join('');
  $('#achievementEmpty').classList.toggle('hidden', profile.achievements.length > 0);
  $$('[data-achievement-field]').forEach((field) => field.addEventListener('input', () => {
    const card = field.closest('[data-achievement-index]');
    profile.achievements[Number(card.dataset.achievementIndex)][field.dataset.achievementField] = field.value;
    if (field.dataset.achievementField === 'title') $('.repeat-card-head strong', card).textContent = field.value || 'Untitled achievement';
    queueSave();
  }));
  $$('[data-delete-achievement]').forEach((button) => button.addEventListener('click', () => {
    profile.achievements.splice(Number(button.dataset.deleteAchievement), 1);
    renderAchievements();
    queueSave();
  }));
}

function addPublication() {
  profile.publications.push({ title: '', type: 'Journal article', year: new Date().getFullYear().toString(), venue: '', url: '' });
  renderPublications();
  queueSave();
  requestAnimationFrame(() => $$('[data-publication-field="title"]').at(-1)?.focus());
}

function addAchievement() {
  profile.achievements.push({ title: '', category: 'Award', year: new Date().getFullYear().toString(), description: '' });
  renderAchievements();
  queueSave();
  requestAnimationFrame(() => $$('[data-achievement-field="title"]').at(-1)?.focus());
}

function openPublishModal() {
  saveProfile();
  $('#publishModal').classList.add('open');
  $('#publishModal').setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}

function closePublishModal() {
  $('#publishModal').classList.remove('open');
  $('#publishModal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}

function openSidebar() {
  $('#portalSidebar').classList.add('open');
  $('#sidebarBackdrop').classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeSidebar() {
  $('#portalSidebar').classList.remove('open');
  $('#sidebarBackdrop').classList.remove('open');
  document.body.classList.remove('no-scroll');
}

async function bootstrapProfile(){
  try{applyApiProfile(await facultyService.getOwn());populateForms();renderPublications();renderAchievements();renderDashboard()}catch(error){showToast(error.message);if(/Authentication|session/i.test(error.message))setTimeout(()=>window.location.replace('../index.html?login=required'),1000)}
}
bootstrapProfile();

$$('[data-panel-target]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.panelTarget)));
bindGoToButtons();

editableFields.forEach((fieldId) => {
  const field = $(`#${fieldId}`);
  if (!field) return;
  field.addEventListener('input', () => {
    profile[fieldId] = field.value;
    if (fieldId === 'bio') $('#bioCount').textContent = field.value.length;
    queueSave();
  });
  field.addEventListener('change', () => {
    profile[fieldId] = field.value;
    queueSave();
  });
});
$('#instituteEmail').addEventListener('input',()=>{profile.email=$('#instituteEmail').value;queueSave()});

$('#instituteEmail').addEventListener('input', (event) => {
  profile.email = event.target.value.trim().toLowerCase();
  queueSave();
});

if (session.mustChangePassword) {
  document.body.classList.add('password-change-required');
  showPanel('settingsPanel');
  showToast('Please replace the temporary password provided by the administrator.');
}

$('#addPublication').addEventListener('click', addPublication);
$$('[data-add-publication]').forEach((button) => button.addEventListener('click', addPublication));
$('#addAchievement').addEventListener('click', addAchievement);
$$('[data-add-achievement]').forEach((button) => button.addEventListener('click', addAchievement));

$('#publishButton').addEventListener('click', openPublishModal);
$$('[data-close-publish]').forEach((element) => element.addEventListener('click', closePublishModal));
$('#confirmPublish').addEventListener('click', () => {
  if (!hasRequiredFields()) {
    closePublishModal();
    showPanel('profilePanel');
    showToast('Complete all required profile fields and upload your photograph before submitting.');
    return;
  }
  saveProfile().then((saved)=>saved?facultyService.submitOwn():null).then((record)=>{if(!record)return;applyApiProfile(record);closePublishModal();renderDashboard();showToast('Your changes were submitted to the website administrator for review.')}).catch((error)=>showToast(error.message));
});

$('#previewButton').addEventListener('click', () => {
  saveProfile();
  window.open(`faculty-profile.html?facultyId=${encodeURIComponent(facultyId)}&preview=1`, '_blank', 'noopener');
});

$('#facultyPhotoInput').addEventListener('change',async(event)=>{
  const file=event.target.files[0];
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){
    event.target.value='';
    showToast('Choose a JPG, PNG or WebP photograph no larger than 5 MB.');
    return;
  }
  const status=$('#facultyPhotoStatus');
  status.textContent='Uploading photograph…';
  try{
    const asset=await uploadService.uploadFacultyPhoto(file);
    profile.photo=asset.url;
    const saved=await saveProfile();
    if(saved){status.textContent='Photograph uploaded. Submit your profile when all details are complete.';showToast('Photograph uploaded successfully.')}
  }catch(error){status.textContent='Photo upload failed. Please try again.';showToast(error.message)}
  finally{event.target.value=''}
});

$('#facultyPhotoRemove').addEventListener('click',async()=>{
  if(!profile.photo)return;
  profile.photo='';
  renderDashboard();
  await saveProfile();
  $('#facultyPhotoStatus').textContent='Photograph removed. Add a photo before submitting your profile.';
});

$('#passwordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form=event.currentTarget;
  const submit=form.querySelector('button[type="submit"]');
  const feedback=$('#passwordFeedback');
  const currentPassword=$('#currentPassword').value;
  const newPassword=$('#newPassword').value;
  const confirmPassword=$('#confirmPassword').value;
  const setFeedback=(message,state='error')=>{feedback.textContent=message;feedback.className=`password-feedback ${state}`};

  if (newPassword.length < 10) {
    setFeedback('The new password must contain at least 10 characters.');
    $('#newPassword').focus();
    return;
  }
  if (newPassword !== confirmPassword) {
    setFeedback('The new passwords do not match.');
    $('#confirmPassword').focus();
    return;
  }
  if (currentPassword === newPassword) {
    setFeedback('Choose a new password that is different from the current password.');
    $('#newPassword').focus();
    return;
  }

  submit.disabled=true;
  submit.textContent='Updating password…';
  setFeedback('Securely updating your password…','pending');
  try {
    await authService.changePassword(currentPassword,newPassword);
    sessionStorage.removeItem(sessionKey);
    form.reset();
    setFeedback('Password updated. Redirecting you to sign in…','success');
    showToast('Password updated. Please sign in again.');
    setTimeout(()=>window.location.href='../index.html',1200);
  } catch(error) {
    setFeedback(error.message);
    showToast(error.message);
    submit.disabled=false;
    submit.textContent='Update password';
  }
});

$('#logoutButton').addEventListener('click', () => {
  authService.logout().catch(()=>{});
  sessionStorage.removeItem(sessionKey);
  window.location.href = '../index.html';
});

$('#sidebarOpen').addEventListener('click', openSidebar);
$('#sidebarClose').addEventListener('click', closeSidebar);
$('#sidebarBackdrop').addEventListener('click', closeSidebar);

window.addEventListener('beforeunload',()=>clearTimeout(saveTimer));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePublishModal();
    closeSidebar();
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveProfile(true);
  }
});
