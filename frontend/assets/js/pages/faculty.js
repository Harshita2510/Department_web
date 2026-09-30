import { facultyPhotoUrl } from '../shared/faculty-photo.js';
import { escapeHtml, initials } from '../shared/dom.js';
import { safeHttpsUrl } from '../shared/security.js';
import { facultyService } from '../services/faculty.service.js';

const directory = document.querySelector('#facultyDirectory');
const result = document.querySelector('#facultyResult');
const form = document.querySelector('#facultySearch');
const query = document.querySelector('#facultyQuery');


/* =========================================================
   CREATE FACULTY ID CARD
   ========================================================= */

function createFacultyCard(record) {

  const profile = record.approvedSnapshot || {};

  const name =
    [profile.title, profile.fullName]
      .filter(Boolean)
      .join(' ') || 'Faculty Member';

  const designation =
    profile.designation || 'Faculty Member';

  const specialization =
    profile.areaOfSpecialisation || 'Not available';

  const photo =
    facultyPhotoUrl(
      safeHttpsUrl(profile.photoUrl, ''),
      400
    );

  const href =
    `faculty-profile?facultyId=${encodeURIComponent(record.facultyId)}`;


  const photoMarkup = photo

    ? `
      <img
        class="faculty-photo"
        src="${escapeHtml(photo)}"
        alt="${escapeHtml(name)}"
        loading="lazy"
      >
    `

    : `
      <div
        class="faculty-photo-placeholder"
        aria-label="${escapeHtml(name)}"
      >
        ${escapeHtml(
          initials(profile.fullName || record.facultyId)
        )}
      </div>
    `;


  return `
    <article class="faculty-card">

      <div class="faculty-card-header">

        <div class="faculty-card-brand">
          <strong>SGSITS</strong>
          <span>INDORE</span>
        </div>

        <div class="faculty-card-department">
          COMPUTER SCIENCE<br>
          &amp; ENGINEERING
        </div>

      </div>


      <div class="faculty-photo-wrap">

        <div class="faculty-photo-ring">
          ${photoMarkup}
        </div>

      </div>


      <div class="faculty-card-identity">

        <h3>
          ${escapeHtml(name)}
        </h3>

        <p>
          ${escapeHtml(designation)}
        </p>

      </div>


      <div class="faculty-card-info">

        <div class="faculty-info-row">

          <span
            class="faculty-info-icon"
            aria-hidden="true"
          >
            ?
          </span>

          <span class="faculty-info-label">
            Specialisation
          </span>

          <span class="faculty-info-value">
            ${escapeHtml(specialization)}
          </span>

        </div>

      </div>


      <a
        class="faculty-profile-link"
        href="${href}"
        aria-label="View ${escapeHtml(name)}'s full faculty profile"
      >
        View Profile
        <span aria-hidden="true">?</span>
      </a>


      <div class="faculty-card-footer">
        <span>CSE</span>
        <span>SGSITS � INDORE</span>
      </div>

    </article>
  `;
}


/* =========================================================
   RENDER FACULTY
   ========================================================= */

function render(records) {

  if (!records.length) {

    directory.innerHTML = `
      <div class="faculty-directory-empty">

        <strong>
          No published faculty profiles found.
        </strong>

        <span>
          Try another faculty name or area of expertise.
        </span>

      </div>
    `;

    return;
  }


  directory.innerHTML =
    records
      .map(createFacultyCard)
      .join('');
}


/* =========================================================
   LOAD FACULTY
   ========================================================= */

async function load(term = '') {

  result.textContent =
    term
      ? `Searching faculty for �${term}��`
      : 'Loading published faculty profiles�';

  try {

    const records =
      await facultyService.listPublic(term);

    render(records);

    result.textContent =
      term
        ? `${records.length} ${
            records.length === 1
              ? 'profile matches'
              : 'profiles match'
          } �${term}�.`

        : `Showing ${records.length} published faculty ${
            records.length === 1
              ? 'profile'
              : 'profiles'
          }.`;

  } catch (error) {

    console.error(
      'Failed to load faculty profiles:',
      error
    );

    directory.innerHTML = `
      <div class="faculty-directory-empty">

        <strong>
          Faculty profiles could not be loaded.
        </strong>

        <span>
          Please refresh when the API is available.
        </span>

      </div>
    `;

    result.textContent =
      error.message ||
      'Unable to load faculty profiles.';
  }
}


/* =========================================================
   SEARCH
   ========================================================= */

form.addEventListener(
  'submit',
  async (event) => {

    event.preventDefault();

    const button =
      form.querySelector('button');

    button.disabled = true;

    await load(
      query.value.trim()
    );

    button.disabled = false;
  }
);


/* =========================================================
   CURRENT YEAR
   ========================================================= */

document.querySelector('#currentYear').textContent =
  new Date().getFullYear();


/* =========================================================
   INITIAL LOAD
   ========================================================= */

load();