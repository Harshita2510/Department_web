# SGSITS Department Website and CMS

A production-oriented website and content-management system for the Computer Science department at SGSITS, Indore.

The project contains a public institute website, an administrator portal, a faculty self-service portal, an Express API, MongoDB Atlas persistence and Cloudinary image storage.

## Current build status

### Public website

The following public-facing features are built:

- Responsive Computer Science & Engineering department homepage with SGSITS branding and department-focused navigation.
- Department hero, official Computer Engineering building photograph, programme overview, vision and mission, notices, events, research, people, admissions, facilities and placements.
- Embedded SGSITS campus map with department address, accessible fallback and external directions.
- Consistent light-only appearance across public, faculty and administrator pages.
- Published notices, news, events and placements loaded from the backend API.
- Published event images delivered from Cloudinary.
- Year-wise placement archive where each entry opens either an administrator-provided public sheet link or an uploaded official PDF.
- B.Tech CSE syllabus interface covering 8 semesters.
- M.Tech CSE syllabus interface covering 4 semesters.
- Subject-wise syllabus lists inside every semester, with published PDF or image links.
- Timetable interface with the same UG and PG semester structure, split into class timetable and exam timetable sections (MST 1, MST 2, optional MST 3 and end semester).
- Institute-wide academic-calendar page with support for semester-wise updates and archives.
- Public approved-faculty profile page.
- Responsive layouts for desktop, tablet and mobile screens.

### Administrator portal

The administrator interface currently supports:

- Administrator login using an account stored in MongoDB.
- Dashboard and content collection views.
- Creation of faculty accounts using a Faculty ID and temporary password.
- Administrator password resets for faculty accounts, with session invalidation and a mandatory-change prompt on the next login.
- Viewing and reviewing faculty-submitted profile information.
- Saving faculty information as a draft.
- Approving and publishing faculty profiles.
- Deleting a faculty profile and its login account.
- Creating, editing, publishing, moving to draft and deleting notices, news, events, documents and media records.
- Creating placement records using an academic year with either a public HTTPS sheet URL or a PDF upload.
- Publishing and unpublishing placement records.
- Bulk publishing, drafting and deletion for supported content.
- Uploading public content images to Cloudinary through an authenticated backend endpoint.
- Uploading supported documents to MongoDB GridFS.
- Creating syllabus subjects under a programme and semester.
- Assigning one or more faculty members as syllabus uploaders for an individual subject.
- Creating semester timetable records and assigning selected faculty as timetable uploaders.
- Uploading or individually deleting timetable PDFs/images for class, MST 1, MST 2, MST 3 and end-semester slots, with administrator-only publication and deletion.
- Reviewing, publishing or requesting changes to faculty syllabus submissions.
- Secure administrator logout.

### Faculty portal

The faculty self-service flow currently supports:

- Login with the Faculty ID and temporary password created by an administrator.
- Access to only the logged-in faculty member's profile.
- Editing personal, professional, research and contact information.
- Adding qualifications, research interests, courses, publications and achievements.
- Automatic draft saving to MongoDB.
- Profile preview.
- Submission of changes for administrator review.
- Password change after initial login.
- Public visibility only after administrator approval.
- Viewing assigned syllabus subjects and uploading a PDF or image for administrator approval.

Faculty members have no general content-management or publishing permissions. Syllabus upload access is granted per subject by an administrator and does not allow the faculty member to create subjects or publish files.

### Backend and data layer

The backend currently includes:

- Node.js and Express API.
- MongoDB Atlas connection through Mongoose.
- Environment validation with Zod.
- Password hashing with bcrypt.
- JWT authentication using signed HTTP-only cookies.
- Administrator and faculty role authorization middleware.
- Request validation and centralized error handling.
- CORS configuration for the frontend origin.
- Helmet security headers.
- Request compression and HTTP logging.
- API rate limiting.
- Audit logging for important administrator and faculty actions.
- MongoDB indexes for frequently queried and unique fields.
- MongoDB connection pooling.
- Graceful process shutdown.
- Cloudinary Node.js SDK using server-side signed uploads.
- MongoDB GridFS support for document storage and delivery.

## Access model

| Capability | Public visitor | Faculty | Administrator |
|---|:---:|:---:|:---:|
| View published website content | Yes | Yes | Yes |
| View approved faculty profiles | Yes | Yes | Yes |
| Edit own faculty profile | No | Yes | Yes |
| Submit profile for review | No | Yes | No |
| Approve faculty profile | No | No | Yes |
| Create faculty login | No | No | Yes |
| Manage notices, news and events | No | No | Yes |
| Upload event/public images | No | No | Yes |
| Upload syllabus for an assigned subject | No | Assigned subjects only | Yes |
| Publish a subject syllabus | No | No | Yes |
| Manage placement links | No | No | Yes |
| Manage documents | No | No | Yes |
| Publish or delete website content | No | No | Yes |

Authorization is enforced by the backend. Hiding a button in the frontend is not treated as a security control.

## Data stored in MongoDB

The application uses the `sgsits_website` database and the following main collections:

| Collection | Stored data |
|---|---|
| `users` | Administrator/faculty identities, roles, status and bcrypt password hashes |
| `facultyprofiles` | Faculty draft data, approved snapshots and review status |
| `placements` | Academic year, source type, public sheet URL or Cloudinary PDF metadata, and publication status |
| `contents` | Notices, news, events, documents, media metadata and publication status |
| `academicdocuments` | Timetable/calendar metadata, per-slot publication state and assigned faculty IDs |
| `academicsubjects` | Programme/semester subjects, assigned faculty, syllabus asset metadata and approval state |
| `auditlogs` | Actor, action, resource, IP address and user-agent history |
| `uploads.files` | GridFS document metadata |
| `uploads.chunks` | GridFS document binary chunks |

Plain-text passwords are never stored in MongoDB.

## Image and document storage

Public event, news and media images, plus subject syllabus and timetable PDFs/images, are uploaded to Cloudinary. MongoDB stores only their metadata, including:

- Cloudinary provider and public ID.
- Secure delivery URL.
- Original filename and MIME type.
- File size, width, height and format.

The Cloudinary API secret is used only by the backend. Documents can be stored in MongoDB GridFS and served through the API.

Permanent interface assets such as the SGSITS logo remain inside `frontend/assets/images` and are version-controlled with the application.

The homepage department photograph is stored locally as `sgsits-computer-engineering-department.jpg` and was obtained from the official SGSITS Computer Engineering department record. Keeping the image in the repository avoids runtime hotlinking to the institute website.

## Project structure

```text
.
├── frontend/
│   ├── index.html
│   ├── pages/
│   │   ├── academic-calendar.html
│   │   ├── faculty-portal.html
│   │   ├── faculty-profile.html
│   │   ├── placements.html
│   │   ├── site-admin.html
│   │   ├── syllabus.html
│   │   └── timetable.html
│   └── assets/
│       ├── css/                  # Page and component styling
│       ├── images/               # Permanent frontend images
│       └── js/
│           ├── components/       # Reusable frontend components
│           ├── config/           # API configuration
│           ├── data/             # Static fallback/page data
│           ├── pages/            # Academic page entry modules
│           ├── services/         # Backend API clients
│           └── shared/           # DOM, security, storage and formatting helpers
├── backend/
│   ├── scripts/
│   │   └── seed-admin.js
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config/               # Environment, MongoDB and Cloudinary
│       ├── constants/            # Roles and shared constants
│       ├── controllers/          # HTTP handlers
│       ├── middleware/           # Auth, roles, uploads, validation and errors
│       ├── models/               # Mongoose schemas and indexes
│       ├── routes/               # Express routes
│       ├── services/             # Authentication, auditing and Cloudinary logic
│       ├── utils/                # Shared backend utilities
│       ├── validators/           # Zod request validation schemas
│       ├── app.js                # Express application composition
│       └── server.js             # Database connection and server lifecycle
├── package.json
└── README.md
```

## Technology stack

- Frontend: HTML5, CSS3 and modular vanilla JavaScript.
- Backend: Node.js 20+ and Express 5.
- Database: MongoDB Atlas with Mongoose.
- Authentication: JWT, HTTP-only cookies and bcrypt.
- Validation: Zod.
- Public image storage: Cloudinary.
- Document storage: MongoDB GridFS.
- Tests: Node.js built-in test runner.

## Environment configuration

Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

Configure these variables privately:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=sgsits_website
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=8h
FRONTEND_ORIGIN=http://localhost:4173
API_PUBLIC_URL=http://localhost:5000/api
BCRYPT_ROUNDS=12

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

ADMIN_EMAIL=admin@sgsits.ac.in
ADMIN_INITIAL_PASSWORD=replace-with-a-strong-temporary-password
```

For syllabus PDFs, open the selected Cloudinary product environment and enable:

`Settings → Security → Allow delivery of PDF and ZIP files`

Cloudinary Free accounts block PDF delivery by default. Uploading can still succeed while the public PDF URL returns HTTP 401, so this setting is required before publishing syllabus PDFs. The API also checks delivery during publication and reports a configuration error if Cloudinary is still blocking the file.

Never commit `backend/.env` or expose MongoDB, JWT or Cloudinary secrets in frontend code.

## Installation

From the project root:

```bash
npm install
```

Ensure the current development machine's public IP is permitted in the MongoDB Atlas project's Network Access list.

## Create the initial administrator

After MongoDB is configured, run this once:

```bash
npm --workspace backend run seed:admin
```

The script creates the administrator only when it does not already exist. Change the initial password after first login.

## Run the project

Open two terminals in the project root.

Terminal 1 — backend:

```bash
npm run backend
```

Terminal 2 — frontend:

```bash
npm run frontend
```

Open:

- Frontend: `http://localhost:4173`
- API health check: `http://localhost:5000/api/health`

Use the localhost frontend URL during development. If port `4173` is occupied, stop the old process rather than accepting a random port because CORS and cookies are configured for the expected origin.

## Frontend routes

| Page | Development URL |
|---|---|
| Homepage and portal login | `http://localhost:4173/` |
| Administrator portal | `http://localhost:4173/pages/site-admin.html` |
| Faculty portal | `http://localhost:4173/pages/faculty-portal.html` |
| Public faculty profile | `http://localhost:4173/pages/faculty-profile.html?facultyId=FAC-001` |
| Placements | `http://localhost:4173/pages/placements.html` |
| Syllabus | `http://localhost:4173/pages/syllabus.html` |
| Timetable | `http://localhost:4173/pages/timetable.html` |
| Academic calendar | `http://localhost:4173/pages/academic-calendar.html` |

The frontend currently uses static multi-page routing rather than a SPA router.

## API overview

All API routes use the `/api` prefix.

| Route group | Purpose |
|---|---|
| `/api/health` | Service and database health |
| `/api/auth` | Login, logout, current user, password changes and faculty-account creation |
| `/api/faculty` | Own-profile editing, submission, administrator review and public profiles |
| `/api/content` | Public content and administrator content management |
| `/api/placements` | Public placement archive and administrator placement management |
| `/api/academic-documents` | Syllabus, timetable and calendar records |
| `/api/academic-subjects` | Subject creation, assignments, syllabus uploads, review and public subject syllabi |
| `/api/files` | GridFS documents and Cloudinary image uploads |

Public API routes return only published content or approved profile snapshots. Protected routes require the signed authentication cookie and appropriate role.

## Verification commands

Run syntax checks:

```bash
npm run check
```

Run backend tests:

```bash
npm test --workspace backend
```

## Partially completed or remaining work

The following work is still required before a production launch:

- Add administrator UI for academic-calendar records. Timetable management is implemented.
- Move homepage configuration and general website settings from browser `localStorage` into MongoDB.
- Finish Cloudinary-backed faculty photograph upload and cleanup.
- Delete replaced Cloudinary assets and GridFS documents to avoid orphaned files.
- Extend granular faculty permissions to other content modules if required; syllabus and timetable permissions are already scoped.
- Add password reset/recovery and administrator password-management UI.
- Expand automated API, authorization, upload and end-to-end tests.
- Add CSRF protection or an equivalent hardened cross-origin request strategy for production cookie authentication.
- Configure production hosting, HTTPS, secure production origins and environment secrets.
- Add monitoring, alerting, database backups and log retention.
- Perform security testing, accessibility review and load testing before supporting the target user population.

This repository is structured for production development, but it should not be considered production-ready until the remaining security, deployment and verification work is completed.
