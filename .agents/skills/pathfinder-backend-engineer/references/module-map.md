# Module Map

This map distinguishes current runtime implementation from planned docs/schema.

Current `src/server.js` mounts only:

| Mounted path | Route file | Status |
| --- | --- | --- |
| `/test` | `src/modules/test/test.routes.js` | Implemented diagnostic routes |

Most other modules are scaffolded as empty files. Do not treat planned handoff endpoints as implemented API contracts.

## Module Details

| Module | Purpose | Detected files | Current endpoints | Related tables | Dependencies | Notes/gaps |
| --- | --- | --- | --- | --- | --- | --- |
| `ai` | Shared AI/OpenAI services and prompt templates. | `ai.service.js`, `openai.service.js`, `prompts/chat.prompt.js`, `prompts/coverLetter.prompt.js`, `prompts/cvAnalysis.prompt.js`, `prompts/interview.prompt.js`, `prompts/jobMatch.prompt.js` | None | `ai_logs`, `rag_documents`, `rag_chunks`, plus feature tables | Should use `src/config/openai.js` | All files are empty. Needs prompt/service implementation before feature AI work. |
| `appliedJobs` | User job application tracking. | `appliedJobs.controller.js`, `appliedJobs.routes.js`, `appliedJobs.service.js` | None | `applied_jobs`, reads `jobs`, may reference `cover_letters` | Needs auth and jobs/cover letter context | No repository/schema yet. Empty files. |
| `auth` | Node-owned registration/login/JWT account workflows per current schema docs. | `auth.controller.js`, `auth.routes.js`, `auth.service.js` | None | `users`, `roles`, reads `profiles`, `notification_settings` | `bcrypt`, `jsonwebtoken`, auth middleware | Empty files. Handoff conflicts: older text says Supabase Auth, current schema/setup say Node auth. |
| `chat` | AI mentor chat sessions and messages. | `chat.controller.js`, `chat.routes.js`, `chat.service.js` | None | `chat_sessions`, `chat_messages`, reads `rag_documents`, `rag_chunks`, `ai_logs` | AI module, auth | Empty files. Needs RAG/AI boundaries confirmed before implementation. |
| `coverLetters` | Generate, edit, version, and inspect cover letters. | `coverLetters.controller.js`, `coverLetters.routes.js`, `coverLetters.service.js` | None | `cover_letters`, `cover_letter_versions`, `cover_letter_insights`, reads `jobs`, `profiles`, `cv_analyses`, `ai_logs` | AI module, jobs, profiles, CV analysis | Empty files. No repository/schema yet. |
| `cvs` | CV uploads, parsing status, extracted skills, and metadata. | `cvs.controller.js`, `cvParser.service.js`, `cvs.service.js`, `cvs.schema.js`, `cvs.routes.js`, `cvs.repository.js` | None | `cvs`, `cv_skills`, reads `skills`, `cv_analyses` | Storage config, Supabase, AI analysis later | Files exist but are empty. Upload validation and storage handling need implementation. |
| `interviews` | Interview sessions, questions, answers, and feedback. | `interviews.controller.js`, `interviews.routes.js`, `interviews.service.js` | None | `interview_sessions`, `interview_questions`, reads `jobs`, `career_paths`, `ai_logs` | AI module, auth | Empty files. No repository/schema yet. |
| `jobMatches` | Match users/CVs to jobs and store match explanations. | `jobMatches.controller.js`, `jobMatches.routes.js`, `jobMatches.service.js` | None | `job_matches`, reads `jobs`, `cvs`, `cv_analyses`, `skills`, `user_skills` | Jobs, CVs, AI module | Empty files. Scoring rules need confirmation before implementation. |
| `jobs` | Job catalog, manual/API jobs, search/list/detail. | `jobs.controller.js`, `jobs.repository.js`, `jobs.routes.js`, `jobs.schema.js`, `jobs.service.js` | None | `jobs`, reads `skills`, `api_sync_runs`; related `saved_jobs`, `applied_jobs` | Supabase repository, validation | Files exist but are empty. |
| `notifications` | User notification preferences/settings. | `notifications.controller.js`, `notifications.service.js`, `notifications.routes.js` | None | `notification_settings`, reads `users` | Auth | Empty files. No repository/schema yet. |
| `profiles` | One profile per user plus experiences, education, preferences, achievements. | `profiles.controller.js`, `profiles.repository.js`, `profiles.routes.js`, `profiles.schema.js`, `profiles.service.js` | None | `profiles`, `profile_experiences`, `profile_education`, `user_preferences`, `user_achievements`; reads lookups and `career_paths` | Auth, users, storage for avatars | Files exist but are empty. |
| `roadmaps` | Personalized learning roadmaps and steps. | `roadmaps.controller.js`, `roadmaps.routes.js`, `roadmaps.service.js` | None | `roadmaps`, `roadmap_steps`, reads `career_paths`, `skills`, `courses` | AI module, auth | Empty files. No repository/schema yet. |
| `savedJobs` | Save/unsave and list user saved jobs. | `savedJobs.controller.js`, `savedJobs.routes.js`, `savedJobs.service.js` | None | `saved_jobs`, reads `jobs` | Auth, jobs | Empty files. No repository/schema yet. |
| `skills` | Canonical skill catalog and user skills. | `skills.controller.js`, `skills.routes.js`, `skills.service.js` | None | `skills`, `user_skills`, reads courses/jobs/career paths | Auth/admin rules may apply | Empty files. No repository/schema yet. |
| `test` | Diagnostic middleware demos. | `test.controller.js`, `test.service.js`, `test.routes.js` | `GET /test/auth`, `POST /test/validate`, `GET /test/error` | None | `authenticate`, `validateBody`, `sendSuccess`, `asyncHandler`, logger, `AppError` | Only implemented module. Useful pattern sample but not product API. |
| `users` | User account admin/user data operations. | `users.controller.js`, `users.service.js`, `users.schema.js`, `users.routes.js`, `users.repository.js` | None | `users`, `roles`, reads profile-related tables | Auth/admin rules | Files exist but are empty. |

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

- `src/server.js` does not mount `/api/v1`; only `/test`.
- Most product module files are empty.
- Several modules have no repository/schema files despite database ownership in docs.
- `package.json` includes dependencies for jobs, email, files, background work, and AI, but most are not wired.
- `sturcture_explian.md` examples use singular `user.*`, while actual scaffold uses plural `users.*`.
- Handoff tech recommendations conflict with current code in TypeScript vs JavaScript, Zod vs Joi, Prisma vs Supabase JS, and Supabase Auth vs Node auth.

## Source Files Inspected

- `src/server.js`
- all files under `src/modules`
- `docs/DATABASE_SCHEMA.md`
- `docs/DATABASE_SCHEMA_MOCK.json`
- `pathfinder_ai_backend_handoff.md`
- `sturcture_explian.md`
