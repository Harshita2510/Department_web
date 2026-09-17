# Content model overview

The Mongoose implementations live in `backend/src/models/`. Browser-storage records in the frontend are temporary compatibility data only.

## Faculty account

Created by the administrator with only:

- `facultyId`
- Temporary password

Production-generated fields include the user role, password hash, active status, first-login flag and timestamps.

## Faculty profile

Completed by the faculty member after login:

- Name, institute email, designation and department
- Contact details, office and consultation hours
- Biography, qualifications and research interests
- Courses, experience and supervision details
- Publications, achievements and professional links

The editable draft and last approved public snapshot must remain separate. A new faculty edit must not change the public profile until administrator approval.

## Administrator-managed content

- Events
- Placement sheets (`academicYear`, public HTTPS `sheetUrl`)
- Official documents
- News and notices
- Uploaded media and faculty photographs

Every content record should carry its status, author, reviewer, publication date, update timestamps and audit history.

`placements.academicYear` should have a unique index. Only published records are public, sorted newest-first. Sheet URLs should be validated server-side and should point to view-only documents that do not require visitors to request access.
