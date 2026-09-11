# Application architecture

## Boundaries

The repository has two independent applications:

- `frontend/` renders the public website, administrator CMS and faculty workspace.
- `backend/` owns authentication, authorization, validation, MongoDB access and audit history.

The frontend never connects directly to MongoDB and must not make authorization decisions. UI guards improve usability; backend middleware provides security.

## Request flow

```text
Browser page
  → resource service
  → API route
  → authentication and role middleware
  → request validator
  → controller
  → domain service
  → Mongoose model
  → MongoDB
```

Routes stay thin. Controllers translate HTTP requests and responses. Services hold reusable business operations. Models define persistence and indexes. Validators reject malformed data before controller execution.

## Role flow

```text
Admin creates Faculty ID + temporary password
  → faculty signs in and changes temporary password
  → faculty edits only their own draft
  → faculty submits draft
  → admin reviews and approves
  → approved snapshot becomes public
```

Faculty cannot use content or placement mutation routes. `authorize(ROLES.ADMIN)` protects these endpoints independently of the frontend.

## Scaling for 800+ users

- MongoDB connection pooling is configured centrally.
- Unique and compound indexes cover faculty IDs, emails, placement years, status and common listing queries.
- List endpoints are paginated and capped.
- Password hashing, rate limiting, HTTP-only cookies and token invalidation are backend-owned.
- Uploaded files should go to S3-compatible object storage; MongoDB should store only metadata and URLs.
- Audit logs record administrative and publication actions.
- Add Redis-backed distributed rate limits/session revocation when deploying multiple API instances.
