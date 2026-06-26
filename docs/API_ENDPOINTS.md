# PathFinder Backend API Endpoints

Base URL for local development:

```txt
http://localhost:5000
```

API prefix:

```txt
/api/v1
```

For protected endpoints, send:

```txt
Authorization: Bearer <accessToken>
```

You get `accessToken` from `POST /api/v1/auth/login`.

## Health

### GET `/`

Checks that the API is running and Supabase is configured.

Auth: not required

Example response:

```json
{
  "message": "PathFinder API is running",
  "supabase": "connected"
}
```

## Auth

### POST `/api/v1/auth/register`

Creates a new user, creates the profile row, and returns auth tokens.

Auth: not required

Body:

```json
{
  "email": "new.user@example.com",
  "password": "Pathfinder123!",
  "confirmPassword": "Pathfinder123!",
  "name": "New User",
  "university": "Cairo University",
  "major": "Computer Science",
  "location": "Cairo, Egypt",
  "educationLevel": "Bachelor",
  "experienceYear": "0-1 years",
  "currentStatus": "Student",
  "targetCareer": "Frontend Developer"
}
```

Returns:

- user data without `password_hash`
- `accessToken`
- `refreshToken`

### POST `/api/v1/auth/login`

Logs in with email/password and returns tokens.

Auth: not required

Body:

```json
{
  "email": "nour@example.com",
  "password": "Pathfinder123!"
}
```

Returns:

- user data without `password_hash`
- `accessToken`
- `refreshToken`

### GET `/api/v1/auth/me`

Returns the current logged-in user from the token, plus profile and skills from the database.

Auth: required

Returns:

- `user`
- `profile`
- `skills`

Useful for:

- Profile screen
- user context in Flutter
- refreshing skills after CV analysis

## Jobs

### GET `/api/v1/jobs`

Lists published/active jobs with filters and pagination.

Auth: not required

Query params:

```txt
keyword=frontend
location=Egypt
category=Frontend
level=Junior
remote=true
status=published
page=1
limit=20
```

Example:

```txt
GET /api/v1/jobs?keyword=frontend&location=Egypt&limit=10
```

Used by:

- Jobs listing
- Job matching screen base data

### GET `/api/v1/jobs/:id`

Returns one job by id.

Auth: not required

Example:

```txt
GET /api/v1/jobs/90000000-0000-0000-0000-000000000001
```

Used by:

- Job Details screen

### GET `/api/v1/jobs/matched`

Returns jobs with saved AI match data for the logged-in user.

Important: call `POST /api/v1/job-matches/generate` first to generate/update the
stored AI matches. This endpoint only reads stored matches, so it does not spend
AI credits on every list request.

Auth: required

Query params:

```txt
keyword=frontend
location=Egypt
category=Frontend
level=Junior
remote=true
page=1
limit=20
minScore=50
includeWeak=false
includeFallback=false
```

By default, only AI-generated matches are returned. Set `includeFallback=true`
only if you want deterministic fallback matches too. Set `includeWeak=true` to
include low-score matches below 50.

Example:

```txt
GET /api/v1/jobs/matched?limit=20
```

Returns each job with:

- `match.match_percentage`
- `match.matched_skills`
- `match.missing_skills`
- `match.ai_reason`
- `match.generated_by_type`
- `match.created_at`

Used by:

- Job Matching screen
- Job Details AI match card

### POST `/api/v1/jobs/sync`

Fetches jobs from Apify LinkedIn actor and saves normalized jobs into Supabase.

Auth: not required currently

Body:

```json
{
  "search": "Software Engineer",
  "location": "Egypt",
  "maxItems": 5
}
```

Optional body:

```json
{
  "userId": "10000000-0000-0000-0000-000000000002",
  "maxRunCostUsd": 0.05,
  "input": {}
}
```

Notes:

- Uses `APIFY_TOKEN` and `APIFY_ACTOR_ID`.
- Applies a hard max item limit from env.
- Filters out non-technical engineering jobs when searching for software roles.

## Saved Jobs

### GET `/api/v1/jobs/saved`

Lists saved jobs for the logged-in user.

Auth: required

Example:

```txt
GET /api/v1/jobs/saved
```

Used by:

- Saved Jobs screen

### POST `/api/v1/jobs/:id/save`

Saves a job for the logged-in user.

Auth: required

Example:

```txt
POST /api/v1/jobs/90000000-0000-0000-0000-000000000001/save
```

Used by:

- Save/bookmark button on Job Details
- Saved job toggle

### DELETE `/api/v1/jobs/:id/save`

Removes a saved job for the logged-in user.

Auth: required

Example:

```txt
DELETE /api/v1/jobs/90000000-0000-0000-0000-000000000001/save
```

Used by:

- Unsave/bookmark toggle
- Remove from Saved Jobs screen

## Applied Jobs

### GET `/api/v1/jobs/applied`

Lists applications for the logged-in user.

Auth: required

Example:

```txt
GET /api/v1/jobs/applied
```

Used by:

- Applied Jobs History screen

### POST `/api/v1/jobs/:id/apply`

Creates an application record for the logged-in user.

Auth: required

Body:

```json
{
  "coverLetterId": "439524e5-e68b-4f28-9472-1b7e31fc54ea",
  "nextStep": "Wait for recruiter response",
  "nextStepAt": "2026-06-20T10:00:00Z",
  "notes": "Applied from mobile app"
}
```

All body fields are optional.

Example:

```txt
POST /api/v1/jobs/90000000-0000-0000-0000-000000000001/apply
```

Used by:

- Apply Now button

### PATCH `/api/v1/jobs/applied/:id/status`

Updates the status of an application.

Auth: required

Important:

- `:id` is `applied_jobs.id`, not `jobs.id`.

Body:

```json
{
  "status": "interviewing",
  "nextStep": "Technical interview",
  "nextStepAt": "2026-06-20T10:00:00Z",
  "notes": "Prepare React and system design questions"
}
```

Allowed statuses:

```txt
applied
viewed
interviewing
rejected
accepted
withdrawn
```

Used by:

- Applied Jobs History status updates

## Job Matches

### POST `/api/v1/job-matches/generate`

Generates and saves job match records for the logged-in user.

Auth: required

Body for many jobs:

```json
{
  "limit": 5,
  "concurrency": 2
}
```

`limit` controls how many jobs are matched in this request. `concurrency`
controls how many AI calls run at the same time. Keep it low while testing.

Body for one job:

```json
{
  "jobId": "90000000-0000-0000-0000-000000000001"
}
```

Returns saved records in `job_matches`.

Used by:

- Saved/cached matching results
- Job Matching workflows

### GET `/api/v1/job-matches`

Lists saved job matches for the logged-in user.

Auth: required

Query params:

```txt
page=1
limit=20
minScore=50
includeWeak=false
includeFallback=false
```

By default, only AI-generated matches are returned.

Example:

```txt
GET /api/v1/job-matches?limit=20
```

### GET `/api/v1/job-matches/:id`

Returns one saved job match by id.

Auth: required

Important:

- User can only fetch their own match records.

## Cover Letters

### POST `/api/v1/cover-letters/generate`

Generates a cover letter for the logged-in user and job.

Auth: required

AI:

- Uses Gemini when configured.
- Falls back to system template if Gemini fails.

Body:

```json
{
  "jobId": "90000000-0000-0000-0000-000000000001",
  "tone": "professional",
  "keywords": ["React", "Leadership", "UI Design"],
  "companyInterest": "I follow the company products and like the focus on scalable user experiences.",
  "achievement": "I led the migration to a new React architecture and improved maintainability.",
  "language": "en"
}
```

Allowed tones:

```txt
professional
enthusiastic
concise
```

Allowed languages:

```txt
en
ar
```

Returns:

- cover letter row
- generated content
- insights
- `generated_by_type` equals `ai` if Gemini succeeded

Used by:

- Cover Letter Generator screen

### GET `/api/v1/cover-letters`

Lists cover letters for the logged-in user.

Auth: required

Query params:

```txt
status=generated
page=1
limit=20
```

Allowed statuses:

```txt
draft
generated
edited
archived
```

Used by:

- Cover Letter History screen

### GET `/api/v1/cover-letters/:id`

Returns one cover letter with insights.

Auth: required

Important:

- User can only fetch their own cover letters.

Used by:

- Cover Letter Result screen
- Cover Letter Edit screen

### PATCH `/api/v1/cover-letters/:id`

Updates cover letter content and creates a new version.

Auth: required

Body:

```json
{
  "content": "Dear Hiring Team...\n\nUpdated cover letter content.",
  "status": "edited"
}
```

Used by:

- Cover Letter Edit + Save

### GET `/api/v1/cover-letters/:id/versions`

Lists versions for one cover letter.

Auth: required

Used by:

- Edit history/version history

### POST `/api/v1/cover-letters/:id/export`

Marks a cover letter as exported by setting `exported_at`.

Auth: required

Used by:

- Export/Copy/Download flow

### DELETE `/api/v1/cover-letters/:id`

Archives a cover letter.

Auth: required

It does not hard delete. It updates:

```txt
status = archived
```

Used by:

- Delete/archive from Cover Letter History

## Skills Data

CV analysis endpoints are not exposed by this API. CV analysis is handled by the
separate CV feature, and this API consumes the resulting skills from Supabase.

Job matching and cover letter generation read skills from:

```txt
skills
user_skills
cv_skills
```

The matching and cover letter flows first use `user_skills`, then also include
skills from the latest completed CV via `cv_skills`.

Used by:

- AI Job Matching
- Cover Letter Generator
- user context in Flutter

## RAG Documents

These endpoints manage RAG documents used by AI features.

Current note:

- They are not protected by auth in the current routes.
- Treat them as admin/internal endpoints unless auth is added.

### POST `/api/v1/rag/documents`

Creates a RAG document from text/content.

Auth: not required currently

### POST `/api/v1/rag/documents/upload`

Uploads a PDF RAG document.

Auth: not required currently

Content type:

```txt
multipart/form-data
```

Form data:

```txt
file: document.pdf
```

Rules:

- PDF only
- max size 20MB

### GET `/api/v1/rag/documents`

Lists RAG documents.

Auth: not required currently

### GET `/api/v1/rag/documents/:id`

Returns one RAG document.

Auth: not required currently

### PATCH `/api/v1/rag/documents/:id`

Updates one RAG document.

Auth: not required currently

### DELETE `/api/v1/rag/documents/:id`

Deletes one RAG document.

Auth: not required currently

## Typical Testing Flow

1. Login:

```txt
POST /api/v1/auth/login
```

2. Copy `accessToken`.

3. Make sure the CV feature has saved skills into Supabase:

```txt
skills
user_skills
cv_skills
```

4. Check profile and skills:

```txt
GET /api/v1/auth/me
```

5. Check matching:

```txt
GET /api/v1/jobs/matched?limit=20
```

6. Generate cover letter:

```txt
POST /api/v1/cover-letters/generate
```

7. Apply to a job:

```txt
POST /api/v1/jobs/:id/apply
```

## Notifications

User-scoped notification inbox and per-user notification settings. All endpoints
require auth and only ever touch the logged-in user's own rows.

### GET `/api/v1/notifications`

Lists the logged-in user's notifications, newest first, with pagination.

Auth: required

Query params:

```txt
page=1
limit=20
category=job        # job | interview | insight | learning | document
isRead=false        # filter by read state
unreadOnly=true     # convenience flag for the bell badge list (forces isRead=false)
```

Returns `data.notifications` (array), `data.unreadCount` (number), and
`meta.pagination`. Each notification has:

- `id`, `type`, `category`, `title`, `body`
- `action_label`, `action_url`
- `metadata` (object: progress, score, ids, etc.)
- `is_read`, `read_at`, `created_at`

Used by:

- Notifications screen list
- Bell badge (via `unreadCount`)

### GET `/api/v1/notifications/unread-count`

Returns just `data.unreadCount`. Cheap call for refreshing the bell badge.

Auth: required

### PATCH `/api/v1/notifications/read-all`

Marks all of the user's unread notifications as read. Returns
`data.updatedCount`.

Auth: required

### PATCH `/api/v1/notifications/:id/read`

Marks one notification as read. `:id` must belong to the user. Returns the
updated notification.

Auth: required

### DELETE `/api/v1/notifications/:id`

Dismisses (hard-deletes) one notification owned by the user. Returns the deleted
`id`.

Auth: required

### GET `/api/v1/notifications/settings`

Returns the user's notification toggles, creating a default row on first access.

Auth: required

Returns `data.settings`:

```txt
push_enabled
email_enabled
job_alerts_enabled
roadmap_reminders_enabled
interview_reminders_enabled
ai_tips_enabled
```

### PATCH `/api/v1/notifications/settings`

Updates one or more toggles. Body accepts any subset of the boolean fields
above (at least one required). Returns the full updated `data.settings`.

Auth: required

Body example:

```json
{
  "push_enabled": false,
  "job_alerts_enabled": true
}
```

## Environment Used By These Endpoints

Required for database:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
```

Required for Gemini AI:

```env
GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_EMBEDDING_MODEL=
GEMINI_EMBEDDING_DIMENSIONS=
GEMINI_MAX_OUTPUT_TOKENS=
GEMINI_TEMPERATURE=
```

Required for Apify job sync:

```env
APIFY_TOKEN=
APIFY_ACTOR_ID=
APIFY_MAX_ITEMS=
APIFY_HARD_MAX_ITEMS=
APIFY_MAX_RUN_COST_USD=
```

Optional scheduled jobs sync:

```env
JOBS_SYNC_SCHEDULER_ENABLED=true
JOBS_SYNC_INTERVAL_HOURS=12
JOBS_SYNC_RUN_ON_START=false
JOBS_SYNC_SEARCH=frontend developer
JOBS_SYNC_LOCATION=Egypt
JOBS_SYNC_MAX_ITEMS=20
```

Notes:

- `POST /api/v1/jobs/sync` runs immediately when you call it.
- The scheduler runs automatically while the backend server is running.
- Keep `JOBS_SYNC_RUN_ON_START=false` in normal usage to avoid spending Apify credits every server restart.
- For quick local testing only, you can temporarily set `JOBS_SYNC_INTERVAL_HOURS=0.01`, then restore it to `12`.
