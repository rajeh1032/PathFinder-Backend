# Agent Backend Reference

This document summarizes the PathFinder Backend for future agents and team members. It is based on actual repository files, not assumed product behavior.

## Architecture Summary

The backend is a Node.js/Express CommonJS project. It is organized around modular feature folders under `src/modules`, shared utilities under `src/common`, and environment-backed clients under `src/config`.

Expected flow:

```text
routes -> controllers -> services -> repositories -> Supabase
```

Several feature modules are now implemented and mounted in `src/server.js` (`auth`, `users`, `cvs`, `rag`, `roadmaps`, `courses`, `interviews`, `chat`, `notifications`, and the `test` diagnostics), plus the shared `ai` Gemini support module. The remaining product modules (`appliedJobs`, `coverLetters`, `jobMatches`, `jobs`, `profiles`, `savedJobs`, `skills`) are still empty placeholders. AI is powered by Google Gemini (`src/config/gemini.js`), not OpenAI.

## Docs Read

- `AGENTS.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/DATABASE_SCHEMA_MOCK.json`
- `docs/SUPABASE_SETUP.md`
- `pathfinder_ai_backend_handoff.md`
- `sturcture_explian.md`
- `src/common/explanation.md`
- `src/config/explanation.md`
- `package.json`
- `package-lock.json`
- `.env` variable names only
- `src/server.js`
- all files under `src/config`, `src/common`, `src/modules`
- all files under `supabase`

## Current Runtime API

| Method | Path | File | Notes |
| --- | --- | --- | --- |
| `GET` | `/` | `src/server.js` | Basic API status |
| `GET` | `/openapi/rag.json` | `src/server.js` | Serves RAG OpenAPI spec |
| `GET` | `/test/auth` | `src/modules/test/test.routes.js` | Requires `authenticate` |
| `POST` | `/test/validate` | `src/modules/test/test.routes.js` | Demonstrates Joi validation |
| `GET` | `/test/error` | `src/modules/test/test.routes.js` | Demonstrates `AppError` and error handler |
| `POST` | `/api/v1/auth/register` `/login`, `GET /me`, `POST /change-password` | `src/modules/auth/auth.routes.js` | Node-owned JWT auth |
| `GET`/`PATCH` | `/api/v1/users` (me/list/get/update/activate/deactivate) | `src/modules/users/users.routes.js` | Admin-gated mutations |
| `POST`/`GET` | `/api/v1/cvs/analyze`, `/me/latest-analysis`, `/me/status`, `/me/history`, `/me/:cvId/file-url` | `src/modules/cvs/cvs.routes.js` | Protected; multipart upload + Gemini analysis + user CV file history |
| `POST`/`GET`/`PATCH`/`DELETE` | `/api/v1/rag/documents...` | `src/modules/rag/rag.routes.js` | RAG document CRUD/upload; auth temporarily bypassed |
| `POST`/`GET`/`PATCH` | `/api/v1/roadmaps...` | `src/modules/roadmaps/roadmaps.routes.js` | Protected roadmap generation/retrieval/progress |
| `POST` | `/api/v1/courses/import/preview` | `src/modules/courses/courses.routes.js` | Admin-only MaharaTech import preview with `course_analysis` RAG |
| `POST` | `/api/v1/courses/import/confirm` | `src/modules/courses/courses.routes.js` | Admin-only course import confirmation |
| `GET` | `/api/v1/courses/recommended` | `src/modules/courses/courses.routes.js` | Protected deterministic user course recommendations |
| `GET`/`POST` | `/api/v1/interviews/...` and `/api/interviews/...` | `src/modules/interviews/interviews.routes.js` | Career paths + session generation (mounted at both prefixes) |
| `POST`/`GET` | `/api/chat/...` | `src/modules/chat/chat.routes.js` | Chat sessions/messages; no auth middleware yet |

The `/api/v1` prefix is mounted for implemented product modules.

## Module Map

| Module | Current state | Database ownership/reference |
| --- | --- | --- |
| `ai` | Implemented Gemini support module; 3 of 7 prompts implemented | `ai_logs`, RAG tables, feature-specific tables |
| `appliedJobs` | Empty | `applied_jobs` |
| `auth` | Implemented register/login/me/change-password | `users`, `roles` |
| `chat` | Implemented sessions/messages (no auth yet) | `chat_sessions`, `chat_messages` |
| `coverLetters` | Empty | `cover_letters`, `cover_letter_versions`, `cover_letter_insights` |
| `courses` | Implemented import preview/confirm and recommendations | `courses`, `course_skills`; reads skills, CV analysis, user skills, roadmaps, career path skills |
| `cvs` | Implemented upload/analyze/status with Gemini | `cvs`, `cv_skills` |
| `interviews` | Implemented career paths + session generation with caching | `interview_sessions`, `interview_questions`, `career_paths` |
| `jobMatches` | Empty | `job_matches` |
| `jobs` | Empty files including repository/schema | `jobs` |
| `notifications` | Implemented inbox, settings, and FCM delivery | `notifications`, `notification_settings`, `device_tokens` |
| `profiles` | Empty files including repository/schema | profile-related tables |
| `rag` | Implemented document CRUD/upload (auth bypassed) | `rag_documents`, `rag_chunks` |
| `roadmaps` | Implemented generate/retrieve/progress | `roadmaps`, `roadmap_steps` |
| `savedJobs` | Empty | `saved_jobs` |
| `skills` | Empty | `skills`, `user_skills` |
| `test` | Implemented diagnostics | None |
| `users` | Implemented (but `users.schema.js` empty) | `users`, `roles` |

See `.agents/skills/pathfinder-backend-engineer/references/module-map.md` for detail.

## Database Overview

The schema has 45 public tables covering:

- Auth/users/roles.
- Profiles, experiences, education, preferences, achievements.
- Skills, career paths, courses, and learning progress.
- CVs, extracted skills, and CV analyses.
- Jobs, saved jobs, applied jobs, and job matches.
- Chat sessions/messages.
- Interviews/questions.
- Cover letters, versions, and insights.
- AI logs.
- RAG documents/chunks.
- API sources/sync runs.
- System settings, notification settings, and activity logs.

Storage buckets documented:

- `cvs`
- `profile-images`
- `interview-recordings`
- `rag-documents`

## API Conventions

- Use standardized responses from `src/common/utils/apiResponse.js`.
- Use `asyncHandler` for async controllers.
- Use `AppError` for operational failures.
- Use Joi validation middleware from `src/common/middlewares/validate.middleware.js`.
- Use `authenticate` and `authorize` from `src/common/middlewares/auth.middleware.js`.
- Use pagination helpers from `src/common/utils/pagination.js`.

## Project Rules

- Do not invent schema, endpoints, or workflows.
- Do not edit runtime code during documentation-only tasks.
- Keep feature code inside its module.
- Put shared utilities in `src/common`.
- Put config in `src/config`.
- Do not expose secrets or real `.env` values.
- Treat current schema docs and migrations as database truth.
- Document conflicts rather than silently resolving them.

## Conflicts Found

| Area | Handoff says | Current code/docs say |
| --- | --- | --- |
| Language | TypeScript | CommonJS JavaScript |
| Validation | Zod | Joi is installed and used |
| Auth | Supabase Auth plus JWT verification | Node/Express auth with `users.password_hash` and backend JWT |
| DB layer | Prisma recommended, Supabase JS alternative | Supabase JS client is implemented |
| API prefix | `/api/v1` | Mounted for most modules; `chat` is under `/api/chat`; `interviews` is mounted at both `/api/interviews` and `/api/v1/interviews` |
| AI provider | OpenAI | Google Gemini (`src/config/gemini.js`); no OpenAI in code |

## Needs Confirmation

- Final auth architecture.
- Final API prefix.
- Whether to migrate to TypeScript/Zod/Prisma or continue current stack.
- Test framework and coverage expectations.
- Whether planned endpoints in the handoff are still the desired roadmap.

## How Future Agents Should Work

1. Read `AGENTS.md` and the backend skill references.
2. Inspect the target module and related schema docs.
3. Confirm whether behavior is implemented or only planned.
4. Make the smallest scoped change requested.
5. Validate input, enforce auth, and standardize responses.
6. Verify with available commands or document test gaps.
7. Update docs when contracts or architecture change.
