import { $, $$, escapeHtml as escapeCMS } from './shared/dom.js';
import { readJson } from './shared/storage.js';
import { safeHttpsUrl } from './shared/security.js';
import { authService } from './services/auth.service.js';
import { contentService } from './services/content.service.js';
import { facultyService } from './services/faculty.service.js';
import { placementService } from './services/placement.service.js';

const body = document.body;
const toast = $('#toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3400);
}

// Render administrator-published browser data into the public prototype.
function readCMSData(key) {
  return readJson(localStorage, key, null);
}

function safeCMSLink(value, fallback) {
  return safeHttpsUrl(value, fallback);
}

function displayCMSDate(value) {
  if (!value) return { day: '—', month: '', long: '' };
  const date = new Date(`${value}T12:00:00`);
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date).toUpperCase(),
    long: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  };
}

async function applyPublishedCMSContent() {
  const homepage = readCMSData('sgsitsHomepageSettings');
  if (homepage) {
    const isLegacyDefault = homepage.headline === 'Learn deeply. Build boldly. Lead responsibly.';
    const eyebrow = $('.hero .eyebrow');
    if (eyebrow && homepage.eyebrow && !isLegacyDefault) eyebrow.innerHTML = `<span></span> ${escapeCMS(homepage.eyebrow)}`;
    const heroTitle = $('.hero h1');
    if (heroTitle && homepage.headline && !isLegacyDefault) {
      const parts = homepage.headline.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) || [homepage.headline];
      heroTitle.innerHTML = parts.map((part, index) => index === 1 ? `<em>${escapeCMS(part)}</em>` : escapeCMS(part)).join('<br>');
    }
    const intro = $('.hero-copy > p');
    if (intro && homepage.intro && !isLegacyDefault) intro.textContent = homepage.intro;
    const heroButton = $('.hero-actions .button-gold');
    if (heroButton && !isLegacyDefault) { if (homepage.button) heroButton.firstChild.textContent = `${homepage.button} `; if (homepage.link) heroButton.href = homepage.link; }
    Object.entries(homepage.sections || {}).forEach(([id, visible]) => { const section = $(`#${id}`); if (section) section.hidden = !visible; });
  }

  let data;
  try{
    const [content,placements]=await Promise.all([contentService.listPublic(),placementService.listPublic()]);
    const keys={notice:'notices',news:'news',event:'events',document:'documents',media:'media'};
    data={notices:[],news:[],events:[],documents:[],media:[],placements};
    content.forEach((item)=>{const key=keys[item.type];if(key)data[key].push({...item,date:item.displayDate?.slice?.(0,10)||item.displayDate,file:item.asset?{data:item.asset.url,name:item.asset.name,type:item.asset.mimeType}:null})});
  }catch{data=readCMSData('sgsitsAdminContent')}
  if(!data)return;
  const notices = (data.notices || []).filter((item) => item.status === 'published').sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  if (notices.length) {
    $('#noticeTicker').innerHTML = notices.slice(0, 5).map((item) => { const date = displayCMSDate(item.date); return `<a href="pages/notices.html#notice-${encodeURIComponent(item._id||item.id||'')}"><time>${date.day} ${date.month}</time> ${escapeCMS(item.summary||item.title)}</a>`; }).join('');
    $('#noticeList').innerHTML = notices.slice(0, 6).map((item) => { const date = displayCMSDate(item.date); const category = ['Academic','Examination','Admission'].includes(item.category) ? 'academic' : 'student'; return `<a href="pages/notices.html#notice-${encodeURIComponent(item._id||item.id||'')}" data-category="${category}"><time><strong>${date.day}</strong>${date.month}</time><span><b>${escapeCMS(item.title)}</b><small>${escapeCMS(item.summary||item.category||'Notice')}</small></span><i>↗</i></a>`; }).join('');
  }
  const events = (data.events || []).filter((item) => item.status === 'published').sort((a,b) => (a.date || '').localeCompare(b.date || ''));
  if (events.length) {
    $('.event-stack').innerHTML = events.slice(0, 3).map((item, index) => {
      const date = displayCMSDate(item.date);
      const image = item.file?.type?.startsWith('image/') ? safeCMSLink(item.file.data, '') : '';
      return `<article class="event-card ${image ? 'has-image' : ''} reveal visible delay-${Math.min(index+1,3)}"><div class="event-date"><strong>${date.day}</strong><span>${date.month}<br>${new Date(`${item.date}T12:00:00`).getFullYear()}</span></div>${image ? `<img class="event-thumbnail" src="${escapeCMS(image)}" alt="" loading="lazy">` : ''}<div><span class="tag">${escapeCMS(item.category)}</span><h3>${escapeCMS(item.title)}</h3><p>${escapeCMS(item.summary || 'View event details')}</p></div><button type="button" aria-label="Open event details" data-toast="${escapeCMS(item.body || item.summary || 'Event details')}">↗</button></article>`;
    }).join('');
  }
  const stories = (data.news || []).filter((item) => item.status === 'published').sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  if (stories.length) {
    const story = stories[0]; const date = displayCMSDate(story.date); const image = story.file?.type?.startsWith('image/') ? story.file.data : 'assets/images/campus-life.jpg';
    $('.feature-story').innerHTML = `<div class="story-image"><img src="${image}" alt=""><span>${escapeCMS(story.category)}</span></div><div class="story-copy"><time>${date.long}</time><h3>${escapeCMS(story.title)}</h3><p>${escapeCMS(story.summary)}</p><a href="${story.file?.data || '#events'}">Read the story <span>↗</span></a></div>`;
  }
  const placements = (data.placements || []).filter((item) => item.status === 'published' && safeCMSLink(item.sourceType==='pdf'?item.document?.url:item.sheetUrl, '')).sort((a,b) => (b.academicYear || '').localeCompare(a.academicYear || ''));
  if (placements.length) {
    $('#placementArchivePreview').innerHTML = placements.slice(0, 3).map((item) => `<a class="placement-year-link" href="${escapeCMS(safeCMSLink(item.sourceType==='pdf'?item.document?.url:item.sheetUrl, 'pages/placements.html'))}" target="_blank" rel="noopener noreferrer"><span>${escapeCMS(item.title||`Placement ${(item.academicYear||'').replace('-', '–')}`)}</span><b>Open ${item.sourceType==='pdf'?'PDF':'sheet'} ↗</b></a>`).join('') + '<a class="placement-all-link" href="pages/placements.html">View complete archive →</a>';
  }
}

applyPublishedCMSContent();

// Scroll reveals are intentionally subtle and disabled by the user's reduced-motion setting.
const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 })
  : null;

$$('.reveal').forEach((element) => {
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add('visible');
});

// Mobile navigation and accessible submenu toggles.
const menuToggle = $('#menuToggle');
const mainNav = $('#mainNav');

menuToggle.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  if (window.innerWidth <= 1050) body.classList.toggle('no-scroll', open);
});

$$('.nav-group > button').forEach((button) => {
  button.addEventListener('click', () => {
    const group = button.parentElement;
    const open = group.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
    $$('.nav-group').filter((item) => item !== group).forEach((item) => {
      item.classList.remove('open');
      const itemButton = $('button', item);
      if (itemButton) itemButton.setAttribute('aria-expanded', 'false');
    });
  });
});

$$('#mainNav a').forEach((link) => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  body.classList.remove('no-scroll');
}));

window.addEventListener('resize', () => {
  if (window.innerWidth > 1050) {
    mainNav.classList.remove('open');
    body.classList.remove('no-scroll');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
});

// Announcement ticker.
const ticker = $('#noticeTicker');
ticker.innerHTML += ticker.innerHTML;
let tickerPaused = false;
$('#tickerControl').addEventListener('click', (event) => {
  tickerPaused = !tickerPaused;
  ticker.classList.toggle('paused', tickerPaused);
  event.currentTarget.textContent = tickerPaused ? '▶' : 'Ⅱ';
  event.currentTarget.setAttribute('aria-label', tickerPaused ? 'Play announcements' : 'Pause announcements');
});

// Programme and notice filters.
$$('[data-programme-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    $$('[data-programme-filter]').forEach((item) => {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-selected', String(item === button));
    });
    const selected = button.dataset.programmeFilter;
    $$('.programme-card').forEach((card) => card.classList.toggle('hidden', selected !== 'all' && !card.dataset.level.split(' ').includes(selected)));
  });
});

$$('[data-notice-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    $$('[data-notice-filter]').forEach((item) => item.classList.toggle('active', item === button));
    const selected = button.dataset.noticeFilter;
    $$('#noticeList [data-category]').forEach((notice) => notice.classList.toggle('hidden', selected !== 'all' && notice.dataset.category !== selected));
  });
});

// Vision and mission expansion.
const departmentList = $('#departmentList');
$('#departmentToggle').addEventListener('click', (event) => {
  const expanded = departmentList.classList.toggle('expanded');
  event.currentTarget.textContent = expanded ? 'Show core commitments' : 'Read all mission commitments';
});

// Site search uses the content structure and can later be replaced by a CMS search endpoint.
const searchOverlay = $('#searchOverlay');
const siteSearch = $('#siteSearch');
const searchIndex = [
  { title: 'CSE undergraduate and postgraduate admissions', meta: 'Admissions', target: '#admissions', keywords: 'admission apply ug pg btech mtech computer science engineering seats' },
  { title: 'Computer Science and Engineering programmes', meta: 'Academics', target: '#programmes', keywords: 'programme course btech mtech doctoral cse computer engineering' },
  { title: 'Department vision and mission', meta: 'About CSE', target: '#departments', keywords: 'vision mission department purpose values' },
  { title: 'CSE syllabus and curriculum', meta: 'Academic resource', target: 'pages/syllabus.html', keywords: 'syllabus curriculum scheme course btech mtech cse semester' },
  { title: 'CSE semester timetables', meta: 'Academic resource', target: 'pages/timetable.html', keywords: 'class timetable schedule btech mtech cse semester' },
  { title: 'Institute academic calendar', meta: 'Academic resource', target: 'pages/academic-calendar.html', keywords: 'academic calendar semester dates holiday examination schedule' },
  { title: 'Faculty, staff and research scholars', meta: 'People', target: '#people', keywords: 'faculty staff phd scholar people professor' },
  { title: 'Research papers, patents and projects', meta: 'Research', target: '#research', keywords: 'research paper publication patent project consultancy' },
  { title: 'Past placement sheets', meta: 'Placement', target: 'pages/placements.html', keywords: 'placement recruiter company career training alumni sheet archive year' },
  { title: 'Latest notices and news', meta: 'Notice centre', target: '#notices', keywords: 'notice news update circular pdf' },
  { title: 'Events, seminars and workshops', meta: 'Campus pulse', target: '#events', keywords: 'event seminar workshop hackathon orientation competition' },
  { title: 'CSE laboratories and department facilities', meta: 'Student life', target: '#campus', keywords: 'computer lab laboratory department facility map student' },
  { title: 'SGSITS campus map and directions', meta: 'Visit the department', target: '#campus-map', keywords: 'campus map location directions address visit sgsits indore cse' },
  { title: 'Department academic resources', meta: 'Resources', target: '#reports', keywords: 'syllabus timetable calendar notices research' }
];

const publishedSearchContent = readCMSData('sgsitsAdminContent');
if (publishedSearchContent) {
  const publicTargets = { notices: '#notices', news: '#events', events: '#events', placements: 'pages/placements.html', documents: '#resources', media: '#campus' };
  Object.entries(publishedSearchContent).forEach(([type, items]) => {
    (items || []).filter((item) => item.status === 'published').forEach((item) => searchIndex.push({ title: item.title, meta: item.category || type, target: type === 'placements' ? safeCMSLink(item.sheetUrl, publicTargets.placements) : item.file?.data || publicTargets[type] || '#top', keywords: `${type} ${item.summary || ''} ${item.body || ''}` }));
  });
}

function openSearch() {
  searchOverlay.classList.add('open');
  searchOverlay.setAttribute('aria-hidden', 'false');
  body.classList.add('no-scroll');
  setTimeout(() => siteSearch.focus(), 100);
}

function closeSearch() {
  searchOverlay.classList.remove('open');
  searchOverlay.setAttribute('aria-hidden', 'true');
  body.classList.remove('no-scroll');
  siteSearch.value = '';
  renderSearch('');
}

function renderSearch(query) {
  const resultBox = $('#searchResults');
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    resultBox.innerHTML = '<p>Popular</p><button data-search-term="admissions">Admissions</button><button data-search-term="academic calendar">Academic calendar</button><button data-search-term="faculty">Faculty</button><button data-search-term="placements">Placements</button>';
    bindSearchTerms();
    return;
  }
  const terms = normalized.split(/\s+/);
  const matches = searchIndex.filter((item) => terms.every((term) => `${item.title} ${item.meta} ${item.keywords}`.toLowerCase().includes(term)));
  resultBox.innerHTML = matches.length
    ? `<p>${matches.length} result${matches.length === 1 ? '' : 's'}</p>${matches.map((item) => `<a class="search-result-link" href="${item.target}"><span>${item.title}<small style="display:block;color:#7e90a2;margin-top:4px">${item.meta}</small></span><b>→</b></a>`).join('')}`
    : '<p>No matching result. Try a programme, department, notice or service.</p>';
  $$('.search-result-link', resultBox).forEach((link) => link.addEventListener('click', closeSearch));
}

function bindSearchTerms() {
  $$('[data-search-term]', $('#searchResults')).forEach((button) => button.addEventListener('click', () => {
    siteSearch.value = button.dataset.searchTerm;
    renderSearch(button.dataset.searchTerm);
  }));
}

$('#searchOpen').addEventListener('click', openSearch);
$('#searchClose').addEventListener('click', closeSearch);
siteSearch.addEventListener('input', () => renderSearch(siteSearch.value));
bindSearchTerms();

function facultyInitials(name='') {
  return name.trim().split(/\s+/).slice(0,2).map((part)=>part[0]?.toUpperCase()).join('')||'FM';
}

function renderFacultyDirectory(records) {
  const directory=$('#facultyDirectory');
  if(!records.length){
    directory.innerHTML='<div class="faculty-directory-empty"><strong>No published faculty profiles found.</strong><span>Try another name or research area.</span></div>';
    return;
  }
  directory.innerHTML=records.map((record)=>{
    const profile=record.approvedSnapshot||{};
    const name=[profile.title,profile.fullName].filter(Boolean).join(' ');
    const photo=safeCMSLink(profile.photoUrl,'');
    const href=`pages/faculty-profile.html?facultyId=${encodeURIComponent(record.facultyId)}`;
    const expertise=(profile.researchInterests||[]).slice(0,2).join(' · ');
    return `<article class="faculty-directory-card"><a href="${href}" aria-label="View ${escapeCMS(name||record.facultyId)}'s faculty profile"><div class="faculty-card-photo">${photo?`<img src="${escapeCMS(photo)}" alt="${escapeCMS(name)}" loading="lazy">`:`<span>${escapeCMS(facultyInitials(name||record.facultyId))}</span>`}<div class="faculty-card-overlay"><b>View profile</b><i aria-hidden="true">↗</i></div></div><div class="faculty-card-copy"><h3>${escapeCMS(name||'Faculty member')}</h3><p>${escapeCMS(profile.designation||'Faculty member')}</p><small>${escapeCMS(expertise||profile.department||'Computer Science & Engineering')}</small></div></a></article>`;
  }).join('');
}

async function loadFacultyDirectory(query='') {
  const result=$('#peopleSearchResult');
  result.textContent=query?`Searching published profiles for “${query}”…`:'Loading published faculty profiles…';
  try{
    const records=await facultyService.listPublic(query);
    renderFacultyDirectory(records);
    result.textContent=query?`${records.length} profile ${records.length===1?'match':'matches'} for “${query}”.`:`Showing ${records.length} published faculty ${records.length===1?'profile':'profiles'}.`;
  }catch(error){
    $('#facultyDirectory').innerHTML='<div class="faculty-directory-empty"><strong>Faculty profiles could not be loaded.</strong><span>Please refresh when the API is available.</span></div>';
    result.textContent=error.message;
  }
}

$('#peopleSearch').addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = $('#peopleQuery').value.trim();
  const button=$('button[type="submit"]',event.currentTarget);
  button.disabled=true;
  await loadFacultyDirectory(query);
  button.disabled=false;
});

loadFacultyDirectory();

// Modal controls.
function openModal(modal) {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  body.classList.add('no-scroll');
  const focusTarget = $('input, button', modal);
  if (focusTarget) setTimeout(() => focusTarget.focus(), 80);
}

function closeModal(modal) {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  body.classList.remove('no-scroll');
}

$$('[data-modal-open]').forEach((button) => button.addEventListener('click', () => openModal($(`#${button.dataset.modalOpen}`))));
$$('[data-modal-close]').forEach((button) => button.addEventListener('click', () => closeModal(button.closest('.modal'))));

$('#adminForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const identifier = $('#adminEmail').value.trim();
  const password = $('#adminPassword').value;
  const error = $('#adminError');
  const role = $('#loginRole').value;
  if (password.length < 8) {
    error.textContent = 'Your password must contain at least 8 characters.';
    $('#adminPassword').focus();
    return;
  }
  error.textContent = '';
  const submitButton = $('button[type="submit"]', event.currentTarget);
  submitButton.disabled = true;
  submitButton.textContent = 'Opening workspace…';
  try {
    const user=await authService.login(identifier,password);
    if(role==='admin'&&user.role!=='admin')throw new Error('This account does not have administrator access.');
    if(role==='faculty'&&user.role!=='faculty')throw new Error('Use the website administrator tab for this account.');
    const session={...user,signedInAt:new Date().toISOString()};
    sessionStorage.setItem(role==='admin'?'sgsitsAdminSession':'sgsitsFacultySession',JSON.stringify(session));
    window.location.href=role==='admin'?'pages/site-admin.html':'pages/faculty-portal.html';
  } catch(loginError) {
    submitButton.disabled=false;
    submitButton.textContent=role==='admin'?'Open admin console':'Open faculty workspace';
    error.textContent=['Failed to fetch','Load failed'].includes(loginError.message)
      ? 'Cannot reach the SGSITS API. Check that the backend is running and open this site at http://localhost:4173.'
      : loginError.message;
  }
});

$$('[data-login-role]').forEach((button) => button.addEventListener('click', () => {
  const role = button.dataset.loginRole;
  $('#loginRole').value = role;
  $$('[data-login-role]').forEach((tab) => {
    tab.classList.toggle('active', tab === button);
    tab.setAttribute('aria-selected', String(tab === button));
  });
  $('#loginKicker').textContent = role === 'admin' ? 'Website administration' : 'Faculty self-service';
  $('#loginDescription').textContent = role === 'admin' ? 'Sign in to upload, review, manage and publish all website content.' : 'Use the Faculty ID and temporary password provided by the administrator.';
  $('#portalSubmitButton').textContent = role === 'admin' ? 'Open admin console' : 'Open faculty workspace';
  $('#loginIdentifierLabel').textContent = role === 'admin' ? 'Administrator email' : 'Faculty ID';
  $('#adminEmail').type = role === 'admin' ? 'email' : 'text';
  $('#adminEmail').placeholder = role === 'admin' ? 'admin@sgsits.ac.in' : 'e.g. FAC-001';
  $('#adminHint').innerHTML = role === 'admin' ? '<strong>Secure access:</strong> use the administrator account stored in MongoDB.' : '<strong>No self-registration:</strong> a website administrator must create your Faculty ID first.';
  $('#adminError').textContent = '';
}));

// Small utility actions.
$$('[data-toast]').forEach((element) => element.addEventListener('click', () => showToast(element.dataset.toast)));
$('#accessibilityToggle').addEventListener('click', (event) => {
  const enlarged = body.classList.toggle('large-text');
  event.currentTarget.textContent = enlarged ? 'A' : 'A+';
  showToast(enlarged ? 'Larger text enabled.' : 'Default text size restored.');
});
$('#languageToggle').addEventListener('click', () => showToast('Hindi content can be enabled through the bilingual CMS fields.'));
$('#year').textContent = new Date().getFullYear();

if (new URLSearchParams(window.location.search).get('login') === 'required') {
  openModal($('#adminModal'));
  $('#adminError').textContent = 'Please sign in to access the faculty workspace.';
}
if (new URLSearchParams(window.location.search).get('adminLogin') === 'required') {
  openModal($('#adminModal'));
  $('#websiteAdminLoginTab').click();
  $('#adminError').textContent = 'Please sign in as website administrator.';
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (searchOverlay.classList.contains('open')) closeSearch();
    const openModalElement = $('.modal.open');
    if (openModalElement) closeModal(openModalElement);
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
  }
});
