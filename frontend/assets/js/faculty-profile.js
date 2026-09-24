import { facultyPhotoUrl } from './shared/faculty-photo.js';
import { $, escapeHtml, initials } from './shared/dom.js';
import { safeHttpsUrl as safeLink } from './shared/security.js';
import { facultyService } from './services/faculty.service.js';

const params = new URLSearchParams(window.location.search);
const facultyId = (params.get('facultyId') || '').trim().toUpperCase();
const preview = params.get('preview') === '1';
const facultySession=JSON.parse(sessionStorage.getItem('sgsitsFacultySession')||'null');
const ownPreview=preview&&facultySession?.role==='faculty'&&(!facultyId||facultyId===facultySession.facultyId?.toUpperCase());
let profile = null;

const listItems = (value = '', separator = /\r?\n/) => (Array.isArray(value)?value:String(value).split(separator)).map((item) => item.trim()).filter(Boolean);

function renderProfile() {
  if (!profile) {
    $('#profileEmpty').hidden = false;
    return;
  }

  $('#profileContent').hidden = false;
  $('#previewBar').hidden = !ownPreview;
  const fullDisplayName = `${profile.title || ''} ${profile.fullName || 'Faculty Member'}`.trim();
  document.title = `${fullDisplayName} — SGSITS Faculty`;
  $('#publicName').textContent = fullDisplayName;
  $('#publicInitials').textContent = initials(profile.fullName);
  $('#publicDesignation').textContent = profile.designation || 'Faculty member';
  $('#publicDepartment').textContent = profile.department || 'SGSITS Indore';
  $('#publicBio').textContent = profile.bio || 'Biography has not been added yet.';
  if (profile.photoUrl) {
    $('#publicAvatar').style.backgroundImage = `url("${facultyPhotoUrl(profile.photoUrl,380)}")`;
    $('#publicInitials').style.visibility = 'hidden';
  }

  const links = [
    ['Google Scholar', profile.scholarUrl],
    ['ORCID', profile.orcidUrl],
    ['LinkedIn', profile.linkedinUrl],
    ['Website', profile.websiteUrl]
  ].filter(([, value]) => safeLink(value));
  $('#identityLinks').innerHTML = links.map(([label, url]) => `<a href="${escapeHtml(safeLink(url))}" target="_blank" rel="noreferrer">${label} ↗</a>`).join('');

  const contact = [];
  if (profile.email) contact.push(`<a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a>`);
  if (profile.phone) contact.push(`<a href="tel:${escapeHtml(profile.phone.replace(/\s/g, ''))}">${escapeHtml(profile.phone)}</a>`);
  if (profile.office) contact.push(`<p>${escapeHtml(profile.office)}</p>`);
  if (profile.officeHours) contact.push(`<p>Consultation: ${escapeHtml(profile.officeHours)}</p>`);
  $('#contactDetails').innerHTML = contact.join('');

  const qualifications = listItems(profile.qualifications);
  $('#highestQualificationWrap').hidden = !profile.highestQualification;
  $('#publicHighestQualification').textContent = profile.highestQualification || '';
  $('#specialisationWrap').hidden = !profile.areaOfSpecialisation;
  $('#publicSpecialisation').textContent = profile.areaOfSpecialisation || '';
  $('#qualificationList').innerHTML = qualifications.length ? qualifications.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>Qualifications not added.</li>';
  const interests = listItems(profile.researchInterests, ',');
  $('#interestList').innerHTML = interests.length ? interests.map((item) => `<span>${escapeHtml(item)}</span>`).join('') : '<span>Research interests not added</span>';
  const courses = listItems(profile.coursesTaught, ',');
  $('#courseList').innerHTML = courses.length ? courses.map((item) => `<span>${escapeHtml(item)}</span>`).join('') : '<span>Courses not added</span>';
  $('#experienceValue').textContent = profile.experienceYears ?? '—';
  $('#scholarsValue').textContent = profile.scholarsSupervised || '—';
  $('#researchSummaryWrap').hidden = !profile.researchSummary;
  $('#publicResearchSummary').textContent = profile.researchSummary || '';

  if (safeLink(profile.scholarUrl)) {
    $('#scholarLink').hidden = false;
    $('#scholarLink').href = safeLink(profile.scholarUrl);
  }

  const publications = profile.publications || [];
  $('#publicPublicationList').innerHTML = publications.length ? publications.map((item) => `<article><time>${escapeHtml(item.year || '—')}</time><div><h3>${escapeHtml(item.title || 'Untitled publication')}</h3><p>${escapeHtml([item.type, item.venue].filter(Boolean).join(' · '))}</p></div>${safeLink(item.url) ? `<a href="${escapeHtml(safeLink(item.url))}" target="_blank" rel="noreferrer" aria-label="Open publication">↗</a>` : '<span></span>'}</article>`).join('') : '<p class="empty-content">No selected publications have been added.</p>';

  const achievements = profile.achievements || [];
  $('#publicAchievementList').innerHTML = achievements.length ? achievements.map((item) => `<article><time>${escapeHtml(item.year || '—')}</time><div><h3>${escapeHtml(item.title || 'Untitled achievement')}</h3><p>${escapeHtml([item.category, item.description].filter(Boolean).join(' · '))}</p></div><span></span></article>`).join('') : '<p class="empty-content">No awards or achievements have been added.</p>';
}

$('#publicYear').textContent = new Date().getFullYear();
async function loadProfile(){
  if(!facultyId&&!ownPreview){
    $('#profileEmptyMessage').textContent='No faculty employee ID was included in this link. Open the profile from the faculty directory.';
    $('#profileEmpty').hidden=false;
    return;
  }
  try{
    const record=ownPreview?await facultyService.getOwn():await facultyService.getPublic(facultyId);
    if(!ownPreview&&record.facultyId?.toUpperCase()!==facultyId)throw new Error('The requested faculty profile did not match the returned record.');
    profile=ownPreview?record.draft:record.approvedSnapshot;
    renderProfile();
  }catch(error){$('#profileEmptyMessage').textContent=error.message||'The profile is not published or could not be loaded.';$('#profileEmpty').hidden=false}
}
loadProfile();
