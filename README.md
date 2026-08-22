# SGSITS website concept

A responsive, accessible frontend concept for Shri G. S. Institute of Technology & Science, Indore. It translates the supplied visual references and handwritten requirements into an institution-specific information architecture.

## Run locally

No build step or package installation is required.

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Included

- Responsive desktop and mobile navigation with grouped submenus
- Programmes and all 16 SGSITS departments
- Admissions, academics, research, people, placements and student-life pathways
- Notice ticker, notice categories, events and quick academic resources
- Site search, people finder, programme filtering and placement carousel
- NIRF, IQAC, reports, policies, patents and campus-map access
- Accessibility control, keyboard escape handling and reduced-motion support
- Admin-login interface ready to connect to role-based authentication and a CMS
- Teacher self-service dashboard for profile photos, biography, qualifications, research interests, teaching, publications and achievements
- Automatic local draft saving, profile completion tracking, publishing and public-profile preview

## Production integration

The current project is a static frontend. Faculty profile drafts are isolated by email and stored in the current browser using `localStorage`; the temporary login session uses `sessionStorage`. The prototype never stores the entered password. Before production, replace this browser storage with a protected API/database, connect authentication to the institute identity service, enforce server-side ownership checks, scan uploaded images, and add an administrative review/audit workflow.

For prototype access, use any email ending in `@sgsits.ac.in` and a password containing at least six characters.

## Files

- `index.html` — page structure and content
- `styles.css` — visual system and responsive layouts
- `script.js` — navigation, filters, search, carousel and modal behavior
- `admin.html`, `admin.css`, `admin.js` — teacher dashboard and editable profile workflow
- `faculty-profile.html`, `faculty-profile.css`, `faculty-profile.js` — public faculty profile and preview
- `assets/` — SGSITS logo and campus photographs
