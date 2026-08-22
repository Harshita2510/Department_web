const params = new URLSearchParams(window.location.search);
const email = (params.get('email') || '').trim().toLowerCase();
const preview = params.get('preview') === '1';
const storageKey = `sgsitsFacultyProfile:${email}`;
const profile = email ? JSON.parse(localStorage.getItem(storageKey) || 'null') : null;

const $ = (selector, scope = document) => scope.querySelector(selector);
const listItems = (value = '', separator = /\r?\n/) => value.split(separator).map((item) => item.trim()).filter(Boolean);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'FM';
}

function safeLink(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function renderProfile() {
  if (!profile || (!profile.isPublished && !preview)) {
    $('#profileEmpty').hidden = false;
    return;
  }

  $('#profileContent').hidden = false;
  $('#previewBar').hidden = !preview;
  const fullDisplayName = `${profile.title || ''} ${profile.fullName || 'Faculty Member'}`.trim();
  document.title = `${fullDisplayName} — SGSITS Faculty`;
  $('#publicName').textContent = fullDisplayName;
  $('#publicInitials').textContent = initials(profile.fullName);
  $('#publicDesignation').textContent = profile.designation || 'Faculty member';
  $('#publicDepartment').textContent = profile.department || 'SGSITS Indore';
  $('#publicBio').textContent = profile.bio || 'Biography has not been added yet.';
  if (profile.photo) {
    $('#publicAvatar').style.backgroundImage = `url("${profile.photo}")`;
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
  $('#qualificationList').innerHTML = qualifications.length ? qualifications.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>Qualifications not added.</li>';
  const interests = listItems(profile.researchInterests, ',');
  $('#interestList').innerHTML = interests.length ? interests.map((item) => `<span>${escapeHtml(item)}</span>`).join('') : '<span>Research interests not added</span>';
  const courses = listItems(profile.coursesTaught, ',');
  $('#courseList').innerHTML = courses.length ? courses.map((item) => `<span>${escapeHtml(item)}</span>`).join('') : '<span>Courses not added</span>';
  $('#experienceValue').textContent = profile.experienceYears || '—';
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
renderProfile();
