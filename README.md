# SGSITS Department Website and CMS

A production-oriented website and content-management system for the Computer Engineering department at SGSITS, Indore.

The project contains a public institute website, an administrator portal, a faculty self-service portal, an Express API, MongoDB Atlas persistence and Cloudinary image storage.

## Current build status

### Public website

The following public-facing features are built:

- Responsive Computer Engineering department homepage with SGSITS branding and department-focused navigation.
- Department hero, official Computer Engineering building photograph, programme overview, vision and mission, notices, events, research, people, admissions, facilities and placements.
- Embedded SGSITS campus map with department address, accessible fallback and external directions.
- Consistent light-only appearance across public, faculty and administrator pages.
- Published notices, news, events and placements loaded from the backend API.
- Published event images delivered from Cloudinary.
- Year-wise placement archive where each entry opens either an administrator-provided public sheet link or an uploaded official PDF.
- B.Tech syllabus interface covering 8 semesters.
- M.Tech syllabus interface covering 4 semesters.
- Subject-wise syllabus lists inside every semester, with published PDF or image links.
- Timetable interface with the same UG and PG semester structure, split into class and examination schedules. Examination schedules support quiz, practical, MST 1, MST 2, optional MST 3 and end semester files.
- Public previous-question-paper archive grouped semester-wise and subject-wise, with filters for B.Tech/M.Tech and Mid-Sem/End-Sem papers.
- Institute-wide academic-calendar page with administrator-only PDF upload, semester-wise updates and archives.
- Notice workflow with optional short/long descriptions, title fallbacks, official PDF/JPEG/PNG attachments and administrator publishing.
- Granular notice permission that administrators can grant to selected faculty; faculty submissions remain private drafts until reviewed.
- Public approved-faculty profile page.
- Faculty onboarding with employee ID and a temporary password only. The faculty member must change that password before profile editing is unlocked.
- Faculty-owned profile photographs stored in Cloudinary; administrators receive a read-only review and approval action.
- Responsive layouts for desktop, tablet and mobile screens.

### Administrator portal

The administrator interface currently supports:

- Administrator login using an account stored in MongoDB.
- Dashboard and content collection views.
- MongoDB-backed homepage content editor for the hero introduction, highlights, photograph caption, vision, mission and program outcomes. Outcomes can be added, edited or removed; public content is rendered as plain text and changes publish immediately.
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
- Uploading or individually deleting timetable PDFs/images for class, quiz, practical, MST 1, MST 2, MST 3 and end-semester slots, with administrator-only publication and deletion.
- Creating, uploading, publishing and deleting semester-wise and subject-wise Mid-Sem/End-Sem question-paper PDFs.
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
- Campus-safe general API limits plus a separate failed-login limit.
- Short shared-cache headers for published public data, suitable for a CDN or reverse proxy.
- Separate liveness and MongoDB-aware readiness health checks.
- Audit logging for important administrator and faculty actions.
- MongoDB indexes for frequently queried and unique fields.
- MongoDB connection pooling.
- Graceful process shutdown.
- Cloudinary Node.js SDK using server-side signed uploads.
- MongoDB GridFS support for document storage and delivery.

## Backend security status

Security is enforced by the API, not by hiding frontend controls. The following controls are implemented and covered by automated checks where noted.

**Current verdict:** the implemented backend security baseline passes the local automated suite. This is a development/staging pass, not final production security approval. Production approval still requires CSRF protection, hardened same-origin hosting, secret rotation, the database-backed integration test, dependency/secret scanning, a restore rehearsal, realistic load testing and an independent security review.

### Authentication and account security

- Passwords are hashed with bcrypt and are never returned by the API or stored as plain text.
- Administrator and faculty sessions use signed JWTs in HTTP-only cookies. Production cookies also use the `Secure` flag and `SameSite=Lax`.
- JWT payloads include a token version. Password changes, administrator password resets and faculty deactivation increment that version, invalidating existing sessions.
- Faculty accounts created with an administrator-issued password have `mustChangePassword=true`. Until the faculty member changes it, protected faculty workspace actions—including notice, syllabus, timetable and photograph uploads—return `403`.
- Temporary passwords and normal password changes use the same minimum length of 10 characters. A user cannot change the password to the current password.
- Login responses perform bcrypt work even for an unknown account, reducing account-enumeration timing differences.
- Login failures always use the generic message `Invalid credentials`.
- Faculty accounts can be activated or deactivated by an administrator. Inactive accounts cannot authenticate and their previous sessions stop working.

### Authorization and publication controls

- Role middleware separates public, faculty and administrator operations.
- Faculty members can update only their own profile and only resources explicitly assigned to them.
- Faculty notice access is a separate permission. Faculty can submit drafts but cannot publish notices.
- Only administrators can approve faculty profiles, publish public content, publish academic resources, manage users and delete protected records.
- Published faculty information is stored as an approved snapshot. Draft profile edits do not replace the public version until approval.
- Published notices, syllabi and timetable slots retain an approved snapshot while a faculty replacement waits for review. Editing a live item therefore does not silently remove its last approved public version.
- A GridFS file is public only when its ID is referenced by a published record. Draft uploads are available only to their uploader or an administrator.

### Request, input and upload protection

- Zod validates request bodies, route parameters and query parameters. Repeated scalar parameters, invalid ObjectIds and non-numeric pagination values produce safe `4xx` responses instead of database cast errors.
- JSON and URL-encoded request bodies are limited to 1 MB.
- Upload endpoints enforce file-count and size limits. Current notice, syllabus and timetable limits are 10 MB.
- Uploads are checked using file signatures in addition to the browser-supplied MIME type. PDF, JPEG, PNG, WebP and supported office formats are accepted only by the routes that allow them.
- Notice attachments accept only verified PDF, JPEG or PNG GridFS uploads. The notice content API accepts the uploaded file ID—not a client-authored URL, MIME type, provider, filename or size—and reconstructs metadata from MongoDB.
- Faculty photograph URLs are restricted to this application's configured Cloudinary account. Image URLs are assigned through DOM properties instead of being interpolated into HTML style attributes.
- Placement links must be valid HTTPS URLs.
- CORS allows credentials only from `FRONTEND_ORIGIN`; development additionally permits the expected localhost frontend on port 4173.

### HTTP, error and infrastructure protection

- Helmet supplies standard HTTP security headers, Express hides `X-Powered-By`, and production must use HTTPS.
- Unexpected server errors return `Internal server error`; MongoDB, Mongoose and stack messages are logged server-side but are not returned to the browser.
- Operational errors such as CORS rejection preserve their intended safe status code.
- Every request receives a request ID for correlating safe client errors with server logs.
- The general API limiter and failed-login limiter are separate. Successful logins do not consume the failed-login allowance.
- Production requires a shared Redis/Valkey URL so rate limits remain consistent across multiple API instances.
- `trust proxy` is disabled by default. It accepts only explicitly configured proxy IP/CIDR ranges, preventing direct clients from bypassing rate limits with a forged `X-Forwarded-For` header.
- Health probes bypass rate limiting so an unavailable Redis service cannot hide database/readiness failures.
- Unhandled rejections and uncaught exceptions shut down with a non-zero exit code so the process supervisor recognises a crash and restarts the instance.

### File and media lifecycle

- Replaced or deleted faculty photographs are removed from Cloudinary when no approved profile still references them.
- Deleting a faculty member also removes their ID from syllabus and timetable editor lists.
- Notice GridFS files are deleted after their last notice reference is removed or replaced.
- Read-only audit commands are available for old notice assets and faculty photographs:

```bash
npm --workspace backend run audit:notices
npm --workspace backend run audit:faculty-images
```

Use `npm --workspace backend run audit:faculty-images -- --delete` only after reviewing the reported unreferenced Cloudinary images.

### Security verification status

The automated suite covers validators, authorization middleware, password policy, temporary-password restrictions, upload signatures, notice-file ownership/publication, published snapshots, trusted proxies, safe errors, faculty photograph delivery and crash exit behaviour.

Run the complete verification before every deployment:

```bash
npm run check
npm test --workspace backend
```

The latest local verification on 5 October 2026 completed 107 tests: 106 passed, 1 database-dependent integration test was skipped and 0 failed. A skipped integration test is not a production pass; it must be run against an isolated staging database before launch.

### Known security work before production

- Cookie authentication does not yet include a dedicated CSRF token. Production must keep the frontend and `/api` on the same site, retain the origin allow-list and add token-based CSRF protection before allowing cross-site deployment.
- `SameSite=Lax` cookies will not support a frontend and API hosted on unrelated sites. Use a same-origin `/api` reverse-proxy/rewrite as documented below. Do not weaken the cookie to `SameSite=None` without adding CSRF protection.
- Add automated dependency and secret scanning in CI, for example `npm audit`, Dependabot and a repository secret scanner. Review findings rather than applying breaking upgrades automatically.
- Arrange an independent penetration test covering authentication, authorization, stored XSS, CSRF, upload handling, rate limits and ID-based file access.
- Rotate MongoDB, JWT, Redis, Cloudinary and administrator credentials before launch and whenever exposure is suspected.
- Centralised production log retention, alerting and incident-response ownership must be configured in the hosting platform.

## Non-functional requirements

The following are target service requirements. They are not guarantees until the final production architecture passes staging tests under the same database tier, regions, instance sizes and CDN configuration.

| Area | Requirement / acceptance target | Current implementation and proof required |
|---|---|---|
| Concurrent audience | Support approximately 800 simultaneous public visitors and about 150 registered faculty accounts | CDN-cacheable public responses, connection pooling, shared Redis limiting and a k6 scenario are implemented; final capacity must be measured on staging |
| Response time | At peak load: p95 below 1.5 seconds and p99 below 3 seconds for the tested public journey | Measure through the normal CDN route and directly against the staging API |
| Error rate | Fewer than 1% failed requests during the five-minute 800-visitor hold | k6 thresholds fail the run when the target is exceeded |
| Availability | No single API instance should take down the site | Deploy at least two API instances behind a managed HTTPS load balancer; readiness removes unhealthy instances |
| Scalability | Add API instances without losing rate-limit consistency or session validity | API is stateless apart from MongoDB/Redis; JWTs work across instances and Redis stores shared limiter state |
| Database capacity | Total application connection pools must remain below the selected Atlas tier limit | Default maximum is 20 connections per instance; two instances can consume about 40, so monitor before increasing |
| Reliability | Clean shutdown on deployment; crash exits non-zero; no new requests accepted during shutdown | Graceful shutdown closes HTTP, MongoDB and Redis with a configurable 10-second deadline |
| Data integrity | Only one current academic calendar; valid programme/semester combinations; unique IDs and years where required | Model validation, unique indexes and transactional calendar replacement are implemented |
| Security | Protected actions require authentication, role/permission checks and validated input | Automated security tests plus staging penetration/security review |
| Privacy | Store only required faculty/profile data and never expose password hashes or draft profiles publicly | Password hashes use `select:false`; public profile APIs return approved data only |
| Accessibility | Keyboard navigation, visible focus, semantic labels and readable contrast on supported pages | Perform WCAG 2.1 AA automated and manual review before launch |
| Compatibility | Current stable Chrome, Safari, Firefox and Edge; responsive from 320 px upward | Run a browser/device test matrix before each release |
| Maintainability | Syntax checks and automated tests must pass before merge/deploy | `npm run check` and `npm test --workspace backend`; CI is still to be configured |
| Observability | Operators can detect downtime, latency, errors, restarts, DB/Redis pressure and backup failures | Configure platform metrics, structured/central logs, dashboards and alerts |
| Recoverability | Database and media can be restored without relying on an API instance's local disk | Atlas backup/restore and Cloudinary asset recovery must be enabled and rehearsed |

### Supported workload and architecture

The 800-user target describes simultaneous readers, not 800 registered accounts, uploads or direct MongoDB connections. Static HTML, CSS, JavaScript and images should be served by a CDN. Published API responses use `s-maxage` and `stale-while-revalidate`, allowing a reverse proxy/CDN to absorb repeated public reads. Authenticated requests and cache misses reach the API.

The intended production request path is:

```text
Browser
  -> HTTPS static host/CDN
  -> same-origin /api rewrite
  -> managed load balancer
  -> two or more stateless Node.js API instances
       -> MongoDB Atlas (persistent records and GridFS)
       -> Redis/Valkey (shared rate-limit counters)
       -> Cloudinary (public media)
```

Do not store application data on an API instance's local filesystem. Instances must be replaceable without data loss.

### Performance and capacity procedure

1. Create separate staging services in the same regions and tiers proposed for production.
2. Run smoke tests with 10–25 users, then average load around 100 users.
3. Ramp to 800 visitors, hold for at least five minutes and allow the scripted public journey to request static pages, public APIs and sample downloads.
4. Add a small authenticated workload (for example 10 staging faculty users) rather than treating every visitor as a logged-in editor.
5. Record RPS, p50/p95/p99 latency, error and `429` rates, API CPU/RAM/restarts, event-loop pressure, Atlas CPU/connections/slow queries, Redis failures and CDN cache-hit ratio.
6. Repeat once through the CDN and once with the CDN bypassed to identify whether the bottleneck is the edge, API, database or file delivery.
7. Increase one resource at a time and repeat. Do not select a service tier solely from the number 800.

Uploads currently use `multer.memoryStorage()`. This is acceptable only for low-concurrency administrative uploads under the 10 MB limit; 800 public readers do not upload. If staging tests show upload-related memory pressure, replace it with streaming uploads or signed direct-to-object-storage uploads before production.

### Availability, monitoring and alerting

Production must monitor and alert on:

- `/api/health/live` failures, `/api/health/ready` failures and instance restarts.
- p95/p99 latency, request volume, `4xx`, `429` and `5xx` rates.
- API CPU, memory, event-loop lag and open connections.
- Atlas CPU, memory/disk, connection usage, replication lag, query targeting and slow queries.
- Redis availability, latency, memory and evictions.
- CDN cache-hit ratio and origin bandwidth.
- Cloudinary delivery/upload errors and quota consumption.
- Backup failures and restore-test failures.

Assign a named owner and escalation contact for each alert. Keep request IDs in central logs, redact secrets/cookies/passwords, define retention, and never log uploaded file contents or authentication tokens.

### Backup and recovery

- **MongoDB Atlas:** enable automated Cloud Backup for the production cluster. This protects users, content, audit logs and GridFS notice/calendar files. Define retention and point-in-time recovery according to institute policy.
- **Cloudinary:** enable the account's backup/recovery capability where available and retain each asset's public ID in MongoDB. Atlas backup alone cannot restore deleted Cloudinary binaries.
- **Source and configuration:** keep source in the protected Git repository. Store production environment variables in the hosting provider's secret store and maintain an offline inventory of variable names and rotation/recovery owners—never secret values in this README.
- **Redis/Valkey:** rate-limit counters are disposable and are not system-of-record data; restoring Redis is not required for content recovery.
- **API instances:** no backup is required because they are stateless and must not hold persistent local uploads.

Proposed starting objectives, subject to approval by the institute:

- RPO (maximum acceptable persistent-data loss): 24 hours, or lower if Atlas point-in-time recovery is enabled.
- RTO (target time to restore public reading): 4 hours.
- Restore verification: quarterly and before major production migrations.

A restore rehearsal must restore Atlas into a new temporary cluster, point a staging API at it, verify administrator/faculty login, approved profiles, published content, GridFS downloads and Cloudinary links, and document actual recovery time. Never test a restore by overwriting the live production cluster.

### Release and rollback requirements

Before deployment:

1. Review changed environment variables and database/index changes.
2. Run syntax checks, all automated tests, notice/faculty asset audits and a staging smoke test.
3. Confirm Atlas backup success and note the last restorable point.
4. Deploy one version, verify health/readiness and exercise login, publication and public downloads.
5. Roll back application code when health, error-rate or latency thresholds fail. Restore data only when a confirmed data migration/corruption incident requires it.
6. Record the deployed commit, operator, time, checks and rollback outcome.

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
| View published previous question papers | Yes | Yes | Yes |
| Manage previous question papers | No | No | Yes |
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
| `questionpapers` | Programme, semester, subject, examination type, academic year, Cloudinary PDF metadata and publication state |
| `homepagesettings` | Administrator-managed homepage introduction, highlights, photograph caption, vision and mission |
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
│   │   ├── question-papers.html
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
MONGODB_MIN_POOL_SIZE=2
MONGODB_MAX_POOL_SIZE=20
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=8h
FRONTEND_ORIGIN=http://localhost:4173
TRUSTED_PROXY_CIDRS=
API_PUBLIC_URL=http://localhost:5000/api
BCRYPT_ROUNDS=12
API_RATE_LIMIT_WINDOW_MS=300000
API_RATE_LIMIT_MAX=10000
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
REDIS_URL=
PUBLIC_CACHE_MAX_AGE_SECONDS=0
PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS=30
PUBLIC_CACHE_STALE_SECONDS=120
HTTP_KEEP_ALIVE_TIMEOUT_MS=65000
HTTP_HEADERS_TIMEOUT_MS=66000
HTTP_REQUEST_TIMEOUT_MS=30000
SHUTDOWN_TIMEOUT_MS=10000

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
- Liveness check: `http://localhost:5000/api/health/live`
- Readiness check: `http://localhost:5000/api/health/ready`

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
| Previous question papers | `http://localhost:4173/pages/question-papers.html` |
| Academic calendar | `http://localhost:4173/pages/academic-calendar.html` |

The frontend currently uses static multi-page routing rather than a SPA router.

## API overview

All API routes use the `/api` prefix.

| Route group | Purpose |
|---|---|
| `/api/health` | Service and database health |
| `/api/auth` | Login, logout, current user, password changes and faculty-account creation |
| `/api/faculty` | Faculty-owned profile editing, submission, read-only administrator approval and public profiles |
| `/api/content` | Public content and administrator content management |
| `/api/homepage` | Public homepage settings and administrator-only homepage editing |
| `/api/placements` | Public placement archive and administrator placement management |
| `/api/academic-documents` | Syllabus, timetable and calendar records |
| `/api/academic-subjects` | Subject creation, assignments, syllabus uploads, review and public subject syllabi |
| `/api/question-papers` | Administrator-managed Mid-Sem/End-Sem PDFs and the public question-paper archive |
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

## Production traffic and scaling

For the account-by-account staging and production procedure, use
[docs/production-deployment-checklist.md](docs/production-deployment-checklist.md).

The expected audience is about 150 faculty accounts and up to 800 simultaneous public visitors. Most visitor requests are read-only, so production should use this layout:

1. Serve `frontend/` through a static host/CDN.
2. Run at least two API instances behind a managed HTTPS load balancer.
3. Route readiness checks to `/api/health/ready` and liveness checks to `/api/health/live`.
4. Keep MongoDB Atlas and Cloudinary as managed external services.
5. Let the CDN honor the public API `s-maxage` and `stale-while-revalidate` headers.

`TRUSTED_PROXY_CIDRS` is empty by default, so direct clients cannot influence `request.ip` with `X-Forwarded-For`. When the API is behind a load balancer, set it only to the exact proxy IP addresses or CIDR ranges published by the selected provider, for example:

```env
TRUSTED_PROXY_CIDRS=203.0.113.10/32,2001:db8:1234::/48
```

Do not use a hop count, `true`, `0.0.0.0/0` or `::/0`. Configure the load balancer to remove untrusted forwarding headers and append the real client address. The API origin must also be protected by its firewall/security group so that only the load balancer can connect. If the provider does not publish stable proxy ranges, leave this setting empty until its authenticated forwarding mechanism has been integrated; rate limits will otherwise group traffic under the proxy address, but they will not trust attacker-supplied addresses.

The general API limit defaults to 10,000 requests per five minutes per observed IP so hundreds of students behind one campus NAT are not rejected by the old 300-request limit. Failed logins have a separate 10-attempt limit per IP-and-identity combination. Development can use the in-memory limiter by leaving `REDIS_URL` empty. Production refuses to start without `REDIS_URL`; the general and login limiters use separate prefixes in the shared Redis/Valkey store so limits remain consistent across API instances.

These settings are safe starting values, not a capacity guarantee. Run a load test against staging with the final hosting plan, Atlas tier and realistic pages before launch.

### Simulate 800 simultaneous homepage visitors

The repository includes a dependency-free Node.js burst test. Each simulated visitor opens the public homepage data by requesting content and placements in parallel. Therefore, 800 visitors generate 1,600 API requests at nearly the same time.

First use a small local smoke test while the backend is running:

```bash
npm --workspace backend run load-test:public -- --visitors=25
```

Do not run the full test against the live production database during active use. Point it at a staging API with staging Atlas data:

```bash
npm run load-test:800 -- --base-url=https://staging-api.example.edu/api
```

No login or API key is required because the test accesses only public endpoints. Available options are:

```text
--base-url=<API /api URL>
--visitors=<1-5000>
--timeout-ms=<request timeout>
--max-error-percent=<failure threshold; default 1>
--max-p95-ms=<latency threshold; default 1500>
```

The command fails when more than 1% of requests fail or p95 latency exceeds 1,500 ms. Record the API CPU/memory, Atlas connections/CPU and CDN cache-hit rate during the run. Run the test once directly against the staging API to measure backend capacity and again through the production-style CDN/API route to verify caching.

Each API instance defaults to a MongoDB pool of 2–20 connections. Two instances can therefore use up to 40 database connections. Confirm that the selected Atlas tier supports the total connection budget before raising `MONGODB_MAX_POOL_SIZE`; a larger pool is not automatically faster.

## Timetable generator integration boundary

The external timetable generator should remain a separate service. The department API should receive a completed PDF through an authenticated server-to-server request or a signed callback, validate the file, store it through the existing timetable upload service, and leave it in draft/submitted state for administrator publication. Before implementing this connector, agree on the generator URL, authentication method, job identifier, callback/retry format and maximum PDF size. Do not share the website administrator password with the generator.

## Notice and academic-calendar storage

- Notice PDF/JPEG/PNG attachments and academic-calendar PDFs are stored in MongoDB GridFS. MongoDB stores the file chunks and metadata; content records store the public API URL used to stream the file inline.
- Notice text, publication status, authorship and faculty permissions are stored as normal MongoDB documents.
- Event and other website images remain in Cloudinary, which is better suited to image delivery and transformation.
- Only administrators publish notices and academic calendars. Selected faculty can upload notice drafts, but cannot publish them.

Notice attachment metadata is generated by the API from a verified GridFS upload. The notice create/update API accepts only that upload's file ID; it does not trust client-supplied URLs, MIME types, providers or sizes. To audit records created before this rule was introduced, run:

```bash
npm --workspace backend run audit:notices
```

The audit is read-only and exits unsuccessfully when it finds a missing file, non-notice GridFS object, ownership mismatch or non-canonical attachment metadata.

Faculty photograph uploads now persist the Cloudinary public ID in MongoDB. Replacing a draft photograph, removing an unpublished photograph, approving a replacement, or deleting the faculty profile cleans up the corresponding Cloudinary image while preserving any image still used by the currently published profile.

Images uploaded before this cleanup was implemented may already be orphaned. First review them with the read-only audit:

```bash
npm --workspace backend run audit:faculty-images
```

After confirming the printed list, delete only those unreferenced faculty images with:

```bash
npm --workspace backend run audit:faculty-images -- --delete
```

## Partially completed or remaining work

The following work is still required before a production launch:

- Extend orphan cleanup to non-faculty Cloudinary assets and unused GridFS documents.
- Extend granular faculty permissions to other content modules if required; syllabus and timetable permissions are already scoped.
- Add email-based self-service password recovery if required. Administrator-driven faculty password reset is implemented.
- Expand automated API, authorization, upload and end-to-end tests.
- Add CSRF protection or an equivalent hardened cross-origin request strategy for production cookie authentication.
- Configure production hosting, HTTPS, secure production origins and environment secrets.
- Configure production monitoring, alerting, backup/recovery and centralized log retention.
- Configure the implemented shared Redis/Valkey limiter by setting `REDIS_URL` in production.
- Complete and test the timetable-generator service contract when the other project exposes its API.
- Perform security testing, accessibility review and load testing before supporting the target user population.

This repository is structured for production development, but it should not be considered production-ready until the remaining security, deployment and verification work is completed.
