# Module Map

This map distinguishes current runtime implementation from planned docs/schema.

Current `src/server.js` mounts:

| Mounted path | Route file | Status |
| --- | --- | --- |
| `/test` | `src/modules/test/test.routes.js` | Implemented diagnostic routes |
| `/api/v1/auth` | `src/modules/auth/auth.routes.js` | Implemented register/login/me/change password |
| `/api/v1/cvs` | `src/modules/cvs/cvs.routes.js` | Implemented protected CV analysis/status/latest |
| `/api/v1/rag` | `src/modules/rag/rag.routes.js` | Implemented RAG document CRUD/upload (auth currently bypassed) |
| `/api/v1/roadmaps` | `src/modules/roadmaps/roadmaps.routes.js` | Implemented protected roadmap generation/retrieval/progress |
| `/api/v1/users` | `src/modules/users/users.routes.js` | Implemented user/admin account routes |
| `/api/v1/courses` | `src/modules/courses/courses.routes.js` | Implemented course import preview/confirm and recommendations |
| `/api/v1/interviews` and `/api/interviews` | `src/modules/interviews/interviews.routes.js` | Implemented career paths + session generation (mounted at both prefixes) |
| `/api/chat` | `src/modules/chat/chat.routes.js` | Implemented chat sessions/messages (no auth middleware yet) |

The `ai` module is implemented as a shared support module (Gemini wrapper) and is intentionally not mounted. The following modules are still empty 0-byte scaffolds and are not mounted: `appliedJobs`, `coverLetters`, `jobMatches`, `jobs`, `notifications`, `profiles`, `savedJobs`, `skills`. Do not treat planned handoff endpoints as implemented API contracts.

## Module Details

| Module | Purpose | Detected files | Current endpoints | Related tables | Dependencies | Notes/gaps |
| --- | --- | --- | --- | --- | --- | --- |
| `ai` | Shared AI services and prompt templates. | `ai.service.js`, `gemini.service.js`, `ai.repository.js`, `prompts/cvAnalysis.prompt.js`, `prompts/roadmap.prompt.js`, `prompts/courseAnalysis.prompt.js` (implemented), `prompts/chat.prompt.js`, `prompts/coverLetter.prompt.js`, `prompts/interview.prompt.js`, `prompts/jobMatch.prompt.js` (empty) | None | `ai_logs`, `rag_documents`, `rag_chunks`, plus feature tables | Google Gemini wrapper (`generateJsonCompletion`, `embedText`); logs to `ai_logs` with `provider: 'gemini'` | Implemented support module. 3 of 7 prompt files implemented. |
| `appliedJobs` | User job application tracking. | `appliedJobs.controller.js`, `appliedJobs.routes.js`, `appliedJobs.service.js` | None | `applied_jobs`, reads `jobs`, may reference `cover_letters` | Needs auth and jobs/cover letter context | No repository/schema yet. Empty files. |
| `auth` | Node-owned registration/login/JWT account workflows per current schema docs. | `auth.controller.js`, `auth.routes.js`, `auth.service.js`, `auth.schema.js` | `POST /register`, `POST /login`, `GET /me` (auth), `POST /change-password` (auth) | `users`, `roles`, reads `profiles`, `notification_settings` | `bcrypt`, `jsonwebtoken`, auth middleware | Implemented. No repository (uses service + Supabase). |
| `chat` | AI mentor chat sessions and messages. | `chat.controller.js`, `chat.routes.js`, `chat.service.js` | `POST /sessions`, `GET /sessions`, `POST /:sessionId`, `GET /:sessionId/messages` (mounted at `/api/chat`) | `chat_sessions`, `chat_messages`, reads `rag_documents`, `rag_chunks`, `ai_logs` | `@google/generative-ai` SDK (direct), Supabase | Implemented. No `authenticate` middleware yet and no repository/schema files. |
| `coverLetters` | Generate, edit, version, and inspect cover letters. | `coverLetters.controller.js`, `coverLetters.routes.js`, `coverLetters.service.js` | None | `cover_letters`, `cover_letter_versions`, `cover_letter_insights`, reads `jobs`, `profiles`, `cv_analyses`, `ai_logs` | AI module, jobs, profiles, CV analysis | Empty files. No repository/schema yet. |
| `courses` | Course catalog import, AI metadata extraction, skill mapping, and user recommendations. | `courses.controller.js`, `courses.routes.js`, `courses.service.js`, `courses.repository.js`, `courses.schema.js` | `POST /api/v1/courses/import/preview`, `POST /api/v1/courses/import/confirm`, `GET /api/v1/courses/recommended` | `courses`, `course_skills`, reads `skills`, `cvs`, `cv_analyses`, `user_skills`, `roadmaps`, `roadmap_steps`, `career_path_skills` | Auth, admin role, AI module, RAG `course_analysis` | Import endpoints require `authenticate` and `authorize('admin')`. Recommendations are deterministic. |
| `cvs` | CV uploads, parsing status, extracted skills, and metadata. | `cvs.controller.js`, `cvParser.service.js`, `cvs.service.js`, `cvs.schema.js`, `cvs.routes.js`, `cvs.repository.js` | `POST /analyze` (auth + multer upload), `GET /me/latest-analysis` (auth), `GET /me/status` (auth) | `cvs`, `cv_skills`, reads `skills`, `cv_analyses` | Storage config, Supabase, Gemini AI analysis | Implemented with upload validation and Gemini-based analysis. |
| `interviews` | Interview sessions, questions, answers, and feedback. | `interviews.controller.js`, `interviews.routes.js`, `interviews.service.js`, `interviews.repository.js`, `interviews.schema.js` | `GET /career-paths` (auth), `POST /sessions` (auth) | `interview_sessions`, `interview_questions`, `career_paths`, question-set cache; reads `user_skills`, `cvs`, `cv_skills` | Gemini (`gemini.service`), RAG service, auth | Implemented with embedding-based question-set caching and fallback generation. |
| `jobMatches` | Match users/CVs to jobs and store match explanations. | `jobMatches.controller.js`, `jobMatches.routes.js`, `jobMatches.service.js` | None | `job_matches`, reads `jobs`, `cvs`, `cv_analyses`, `skills`, `user_skills` | Jobs, CVs, AI module | Empty files. Scoring rules need confirmation before implementation. |
| `jobs` | Job catalog, manual/API jobs, search/list/detail. | `jobs.controller.js`, `jobs.repository.js`, `jobs.routes.js`, `jobs.schema.js`, `jobs.service.js` | None | `jobs`, reads `skills`, `api_sync_runs`; related `saved_jobs`, `applied_jobs` | Supabase repository, validation | Files exist but are empty. |
| `notifications` | User notification preferences/settings. | `notifications.controller.js`, `notifications.service.js`, `notifications.routes.js` | None | `notification_settings`, reads `users` | Auth | Empty files. No repository/schema yet. |
| `profiles` | One profile per user plus experiences, education, preferences, achievements. | `profiles.controller.js`, `profiles.repository.js`, `profiles.routes.js`, `profiles.schema.js`, `profiles.service.js` | None | `profiles`, `profile_experiences`, `profile_education`, `user_preferences`, `user_achievements`; reads lookups and `career_paths` | Auth, users, storage for avatars | Files exist but are empty. |
| `roadmaps` | Personalized learning roadmaps and steps. | `roadmaps.controller.js`, `roadmaps.routes.js`, `roadmaps.service.js`, `roadmaps.repository.js`, `roadmaps.schema.js` | `POST /generate` (auth), `GET /me` (auth), `GET /:id` (auth), `PATCH /:roadmapId/steps/:stepId/progress` (auth) | `roadmaps`, `roadmap_steps`, reads `career_paths`, `skills`, `courses` | Gemini AI module, auth | Implemented with repository and schema. |
| `rag` | RAG document/chunk metadata and uploads for retrieval-augmented features. | `rag.controller.js`, `rag.routes.js`, `rag.service.js`, `rag.repository.js`, `rag.schema.js` | `POST /documents`, `POST /documents/upload` (multer), `GET /documents`, `GET /documents/:id`, `PATCH /documents/:id`, `DELETE /documents/:id` | `rag_documents`, `rag_chunks` | Supabase, storage, Gemini embeddings | Implemented. Auth is temporarily bypassed (comment notes admin-auth pending). |
| `savedJobs` | Save/unsave and list user saved jobs. | `savedJobs.controller.js`, `savedJobs.routes.js`, `savedJobs.service.js` | None | `saved_jobs`, reads `jobs` | Auth, jobs | Empty files. No repository/schema yet. |
| `skills` | Canonical skill catalog and user skills. | `skills.controller.js`, `skills.routes.js`, `skills.service.js` | None | `skills`, `user_skills`, reads courses/jobs/career paths | Auth/admin rules may apply | Empty files. No repository/schema yet. |
| `test` | Diagnostic middleware demos. | `test.controller.js`, `test.service.js`, `test.routes.js` | `GET /test/auth`, `POST /test/validate`, `GET /test/error` | None | `authenticate`, `validateBody`, `sendSuccess`, `asyncHandler`, logger, `AppError` | Only implemented module. Useful pattern sample but not product API. |
| `users` | User account admin/user data operations. | `users.controller.js`, `users.service.js`, `users.schema.js` (empty), `users.routes.js`, `users.repository.js` | `GET /me` (auth), `GET /` (auth), `GET /:id` (auth), `PATCH /:id` (admin), `PATCH /:id/activate` (admin), `PATCH /:id/deactivate` (admin) | `users`, `roles`, reads profile-related tables | Auth/admin rules | Implemented, but `users.schema.js` is still empty (validation gap). |

## Planned Endpoints From Handoff

The handoff proposes a base prefix of `/api/v1` and many module endpoints. These are planning references, not implemented routes. Future agents should only implement endpoints explicitly requested by the user and must update docs after implementation.

Relevant planned bases include:

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/profiles`
- `/api/v1/skills`
- `/api/v1/user-skills`
- `/api/v1/career-paths`
- `/api/v1/courses`
- `/api/v1/cvs`
- `/api/v1/cv-analysis`
- `/api/v1/roadmaps`
- `/api/v1/jobs`
- `/api/v1/job-matches`
- `/api/v1/chat`
- `/api/v1/interviews`
- `/api/v1/cover-letters`
- `/api/v1/rag`
- `/api/v1/ai`
- `/api/v1/ai-logs`
- `/api/v1/api-sources`
- `/api/v1/api-sync-runs`
- `/api/v1/dashboard`
- `/api/v1/settings`
- `/api/v1/activity-logs`
- `/api/v1/admin`

## Missing Or Inconsistent Patterns

- `src/server.js` mounts 9 implemented modules; 8 product modules remain empty (`appliedJobs`, `coverLetters`, `jobMatches`, `jobs`, `notifications`, `profiles`, `savedJobs`, `skills`).
- `interviews` is mounted at two prefixes (`/api/interviews` and `/api/v1/interviews`); `chat` is under `/api/chat` instead of `/api/v1/chat`.
- `chat` endpoints have no `authenticate` middleware, and `rag` endpoints bypass auth (temporary), which conflicts with the rule that user/admin endpoints must be protected.
- `users.schema.js` exists but is empty even though the `users` module is implemented (validation gap).
- AI is Google Gemini only; there is no `src/config/openai.js` and no `OPENAI_*` env usage in code.
- 3 of 7 AI prompt files are implemented (`cvAnalysis`, `roadmap`, `courseAnalysis`); the rest are empty.
- `package.json` includes dependencies for jobs, email, files, and background work that are not yet wired.
- `sturcture_explian.md` examples use singular `user.*`, while actual scaffold uses plural `users.*`.
- Handoff tech recommendations conflict with current code in TypeScript vs JavaScript, Zod vs Joi, Prisma vs Supabase JS, Supabase Auth vs Node auth, and OpenAI vs Gemini.

## Source Files Inspected

- `src/server.js`
- all files under `src/modules`
- `docs/DATABASE_SCHEMA.md`
- `docs/DATABASE_SCHEMA_MOCK.json`
- `pathfinder_ai_backend_handoff.md`
- `sturcture_explian.md`
