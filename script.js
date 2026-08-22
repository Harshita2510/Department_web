const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const body = document.body;
const toast = $('#toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3400);
}

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
    $$('.programme-card').forEach((card) => card.classList.toggle('hidden', selected !== 'all' && card.dataset.level !== selected));
  });
});

$$('[data-notice-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    $$('[data-notice-filter]').forEach((item) => item.classList.toggle('active', item === button));
    const selected = button.dataset.noticeFilter;
    $$('#noticeList [data-category]').forEach((notice) => notice.classList.toggle('hidden', selected !== 'all' && notice.dataset.category !== selected));
  });
});

// Department expansion.
const departmentList = $('#departmentList');
$('#departmentToggle').addEventListener('click', (event) => {
  const expanded = departmentList.classList.toggle('expanded');
  event.currentTarget.textContent = expanded ? 'Show featured departments' : 'View all departments';
});

// Placement carousel.
const placementSlides = $$('.placement-slide');
let placementIndex = 0;

function showPlacement(index) {
  placementIndex = (index + placementSlides.length) % placementSlides.length;
  placementSlides.forEach((slide, position) => slide.classList.toggle('active', position === placementIndex));
  $('#placementCount').textContent = `${String(placementIndex + 1).padStart(2, '0')} / ${String(placementSlides.length).padStart(2, '0')}`;
}

$('#placementPrev').addEventListener('click', () => showPlacement(placementIndex - 1));
$('#placementNext').addEventListener('click', () => showPlacement(placementIndex + 1));

// Site search uses the content structure and can later be replaced by a CMS search endpoint.
const searchOverlay = $('#searchOverlay');
const siteSearch = $('#siteSearch');
const searchIndex = [
  { title: 'Undergraduate and postgraduate admissions', meta: 'Admissions', target: '#admissions', keywords: 'admission apply ug pg btech mtech mba mca seats' },
  { title: 'Programmes and departments', meta: 'Academics', target: '#programmes', keywords: 'programme course engineering pharmacy doctoral department' },
  { title: 'Syllabus and curriculum', meta: 'Academic resource', target: '#resources', keywords: 'syllabus curriculum scheme course' },
  { title: 'Academic calendar and time tables', meta: 'Academic resource', target: '#resources', keywords: 'academic calendar timetable schedule' },
  { title: 'Faculty, staff and research scholars', meta: 'People', target: '#people', keywords: 'faculty staff phd scholar people professor' },
  { title: 'Research papers, patents and projects', meta: 'Research', target: '#research', keywords: 'research paper publication patent project consultancy' },
  { title: 'Training and placements', meta: 'Placement', target: '#placements', keywords: 'placement recruiter company career training alumni' },
  { title: 'Latest notices and news', meta: 'Notice centre', target: '#notices', keywords: 'notice news update circular pdf' },
  { title: 'Events, seminars and workshops', meta: 'Campus pulse', target: '#events', keywords: 'event seminar workshop hackathon orientation competition' },
  { title: 'Campus life, map and facilities', meta: 'Student life', target: '#campus', keywords: 'campus club chapter facility map hostel student' },
  { title: 'NIRF, IQAC and annual reports', meta: 'Institutional resources', target: '#reports', keywords: 'nirf iqac report policy nba naac' }
];

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

// People finder demo.
$('#peopleSearch').addEventListener('submit', (event) => {
  event.preventDefault();
  const query = $('#peopleQuery').value.trim();
  $('#peopleSearchResult').textContent = query
    ? `Showing profile matches for “${query}” — ready to connect to the faculty directory.`
    : 'Enter a name, department or research area.';
});

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

$('#adminForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const email = $('#adminEmail').value.trim().toLowerCase();
  const password = $('#adminPassword').value;
  const error = $('#adminError');
  if (!email.endsWith('@sgsits.ac.in')) {
    error.textContent = 'Please use your official @sgsits.ac.in email address.';
    $('#adminEmail').focus();
    return;
  }
  if (password.length < 6) {
    error.textContent = 'Your password must contain at least 6 characters.';
    $('#adminPassword').focus();
    return;
  }
  error.textContent = '';
  const submitButton = $('button[type="submit"]', event.currentTarget);
  submitButton.disabled = true;
  submitButton.textContent = 'Opening workspace…';
  sessionStorage.setItem('sgsitsFacultySession', JSON.stringify({ email, signedInAt: new Date().toISOString() }));
  window.location.href = 'admin.html';
});

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
