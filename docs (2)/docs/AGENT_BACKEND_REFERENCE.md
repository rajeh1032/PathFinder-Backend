# Agent Backend Reference

This document summarizes the PathFinder Backend for future agents and team members. It is based on actual repository files, not assumed product behavior.

## Architecture Summary

The backend is a Node.js/Express CommonJS project. It is organized around modular feature folders under `src/modules`, shared utilities under `src/common`, and environment-backed clients under `src/config`.

Expected flow:

```text
routes -> controllers -> services -> repositories -> Supabase
```

Current implementation is mostly scaffolded. Only `/test` is mounted in `src/server.js`; product modules are largely empty placeholders.

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
| `GET` | `/test/auth` | `src/modules/test/test.routes.js` | Requires `authenticate` |
| `POST` | `/test/validate` | `src/modules/test/test.routes.js` | Demonstrates Joi validation |
| `GET` | `/test/error` | `src/modules/test/test.routes.js` | Demonstrates `AppError` and error handler |

The planned `/api/v1` prefix exists in handoff docs but is not mounted yet.

## Module Map

| Module | Current state | Database ownership/reference |
| --- | --- | --- |
| `ai` | Empty services/prompts | `ai_logs`, RAG tables, feature-specific tables |
| `appliedJobs` | Empty | `applied_jobs` |
| `auth` | Empty | `users`, `roles` |
| `chat` | Empty | `chat_sessions`, `chat_messages` |
| `coverLetters` | Empty | `cover_letters`, `cover_letter_versions`, `cover_letter_insights` |
| `cvs` | Empty files including repository/schema/parser | `cvs`, `cv_skills` |
| `interviews` | Empty | `interview_sessions`, `interview_questions` |
| `jobMatches` | Empty | `job_matches` |
| `jobs` | Empty files including repository/schema | `jobs` |
| `notifications` | Empty | `notification_settings` |
| `profiles` | Empty files including repository/schema | profile-related tables |
| `roadmaps` | Empty | `roadmaps`, `roadmap_steps` |
| `savedJobs` | Empty | `saved_jobs` |
| `skills` | Empty | `skills`, `user_skills` |
| `test` | Implemented diagnostics | None |
| `users` | Empty files including repository/schema | `users`, `roles` |

See `.agents/skills/pathfinder-backend-engineer/references/module-map.md` for detail.

## Database Overview

The schema has 43 public tables covering:

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
| API prefix | `/api/v1` | Not mounted in `src/server.js` |

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
