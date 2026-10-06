# Production deployment checklist (800 concurrent visitors)

The target is approximately 150 authenticated faculty accounts and a peak of 800 simultaneous, mostly anonymous readers. This does not mean 800 uploads or 800 MongoDB connections: static pages and published responses should be absorbed by the CDN, while only cache misses reach the API.

## Accounts to create

Use institute-owned email addresses and enable MFA on every service.

1. **GitHub** — source repository and deployment connection.
2. **Render** — one Static Site, one paid Web Service with at least two instances, and one paid Key Value (Redis/Valkey-compatible) service. Sign in at <https://dashboard.render.com/> with GitHub.
3. **MongoDB Atlas** — the existing database account. Use separate staging and production projects/clusters. For launch, use a dedicated tier selected from measured staging load; MongoDB recommends M30+ for production and permits M10/M20 for low-traffic applications.
4. **Cloudinary** — the existing media account. Keep the API secret only in the API service environment.
5. **Grafana k6** — install open-source k6 locally, or create Grafana Cloud only if a cloud-generated/distributed test is required.

Do not send passwords, MongoDB URIs, Redis URLs, or Cloudinary secrets in chat or commit them to Git.

## Phase 1 — staging

1. In Atlas, create a staging cluster and staging database user. Allow only the Render service's outbound IP ranges where the chosen Atlas networking option permits it.
2. In Render, create a **Web Service** from this repository:
   - Root directory: repository root
   - Build command: `npm ci`
   - Start command: `npm --workspace backend start`
   - Health check: `/api/health/ready`
   - Region: Singapore (and use the same region for Key Value)
3. Create a Render **Key Value** instance in that same region. Keep external access disabled. Copy its internal URL into the API environment as `REDIS_URL`.
4. Create a Render **Static Site**:
   - Build command: leave empty
   - Publish directory: `frontend`
   - Add a rewrite from `/api/*` to `https://YOUR-STAGING-API.onrender.com/api/*` so the browser uses one origin for cookies and API calls.
5. Add the environment variables listed in `backend/.env.example`. For staging use:
   - `NODE_ENV=production`
   - `FRONTEND_ORIGIN=https://YOUR-STAGING-SITE.onrender.com`
   - `API_PUBLIC_URL=https://YOUR-STAGING-SITE.onrender.com/api`
   - `REDIS_URL` from Render Key Value
   - staging Atlas and Cloudinary credentials
6. Keep `TRUSTED_PROXY_CIDRS` empty until the hosting provider's exact trusted proxy ranges are known and direct origin access is blocked. This is safer than trusting arbitrary forwarded headers. Edge rate limiting should also be enabled in the hosting/CDN layer.
7. Run `npm --workspace backend run seed:admin` once from the Render shell, then immediately change the temporary administrator password.

## Phase 2 — availability and data

1. Scale the API to **two paid instances**. Render load-balances a scaled web service. Do not attach a persistent disk to the API instances.
2. Start with `MONGODB_MAX_POOL_SIZE=20`. Two API instances then use at most about 40 application connections; measure before increasing it.
3. Enable Atlas Cloud Backup and define retention. Test an actual restore into a temporary cluster before launch.
4. Enable Atlas alerts for connections, CPU, memory/disk, replication lag and query targeting. Review Performance Advisor after every load test.
5. Keep published images/PDFs in Cloudinary where the existing module supports it. Published GridFS files are now accessible only when referenced by a published record and return public cache headers; draft files return `private, no-store`.
6. Uploads remain limited to 10 MB and are administrative/low-concurrency operations. If tests show upload memory pressure, replace `multer.memoryStorage()` with streaming/direct signed uploads. Do not optimize that path based only on 800 anonymous readers, who never upload.

## Phase 3 — realistic load test

Install k6 and test **staging only**. The included test ramps gradually to 800 users, holds the load, exercises static pages, all important public APIs, and samples published PDF downloads:

```bash
SITE_URL=https://YOUR-STAGING-SITE.onrender.com \
TARGET_VISITORS=800 \
HOLD_DURATION=5m \
k6 run load-tests/production-journey.k6.js
```

To add a small authenticated faculty workload, use a dedicated staging-only faculty account:

```bash
SITE_URL=https://YOUR-STAGING-SITE.onrender.com \
TARGET_VISITORS=800 \
FACULTY_VUS=10 \
FACULTY_ID=LOAD-TEST-FACULTY \
FACULTY_PASSWORD='staging-only-password' \
k6 run load-tests/production-journey.k6.js
```

To exercise one PDF upload, additionally provide `NOTICE_PDF=/absolute/path/to/test.pdf`. This creates a staging GridFS object; reset the staging database after the test. Never enable the write scenario against production.

Pass criteria are less than 1% failed requests, p95 below 1.5 seconds and p99 below 3 seconds. During the test record Render CPU/RAM/restarts, API 5xx/429 counts, Atlas connections/CPU/query targeting/slow queries, Redis errors and CDN cache-hit ratio. Repeat the test with the CDN bypassed to determine actual API capacity, then with normal CDN routing to validate the production path.

## Phase 4 — production cutover

1. Create separate production Render and Atlas resources; never reuse staging data or credentials.
2. Add the institute domain and HTTPS, then keep the frontend and `/api` on the same browser origin through the rewrite.
3. Set production secrets in Render, not in `.env` committed to Git.
4. Scale to two API instances and verify `/api/health/live` and `/api/health/ready` on each deployment.
5. Re-run smoke (10 users), average (100), peak (800), and short stress tests in that order. Stop when error or latency thresholds fail.
6. Configure alerts for API unavailability, elevated p95/p99, 5xx rate, memory, restarts, Redis availability, Atlas connections and backup failures.
7. Document who receives alerts and rehearse rollback, database restore, credential rotation and admin-account recovery.

No service tier should be selected solely from the number “800.” Choose the smallest tier that passes the measured staging workload with safety margin, then scale one level at a time.
