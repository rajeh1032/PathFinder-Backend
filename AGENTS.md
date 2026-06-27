# PathFinder Backend Agent Rules

This file is the main instruction file for Codex and other agents working in the PathFinder Backend repository.

## Project Overview

PathFinder AI is an AI career mentor backend for students, fresh graduates, ITI students, and career shifters. The backend is intended to support user accounts, profiles, CV upload and analysis, skills, jobs, job matching, saved and applied jobs, roadmaps, interviews, cover letters, AI chat, notifications, admin data, AI logs, and RAG metadata.

The repository is currently a Node.js/Express CommonJS backend with a modular folder structure under `src/modules`. Several feature modules are now implemented, while others are still scaffolded as empty files.

Implemented and mounted in `src/server.js`: `auth`, `users`, `cvs`, `rag`, `roadmaps`, `courses`, `interviews`, `chat`, `notifications`, and the `test` diagnostic module. The shared `ai` module (Gemini wrapper) is implemented as a support module but exposes no routes. Still empty (0-byte scaffolds): `appliedJobs`, `coverLetters`, `jobMatches`, `jobs`, `profiles`, `savedJobs`, `skills`.

## Tech Stack Detected

Source of truth: `package.json`, `package-lock.json`, and current source files.

| Area | Current repo state |
| --- | --- |
| Runtime | Node.js |
| Web framework | Express 5 |
| Module format | CommonJS |
| Validation | Joi in current code |
| Database/storage client | `@supabase/supabase-js` and `@supabase/storage-js` |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage or local upload config |
| Auth in current docs/code | Node/Express-owned auth using `public.users.password_hash` and backend JWT |
| AI provider | Google Gemini, configured in `src/config/gemini.js`; chat uses the `@google/generative-ai` SDK directly. No OpenAI usage remains in code. |
| Logging | Winston |
| Rate limiting | `express-rate-limit` |
| File upload dependency | Multer is installed, but upload modules are not implemented yet |
| Background jobs | BullMQ/ioredis are installed, but not wired yet |
| Tests | No real test runner is configured; `npm test` currently exits with an error |

Do not blindly follow older handoff recommendations when they conflict with current code or docs. The handoff mentions TypeScript, Zod, Prisma, Supabase Auth, and OpenAI, but the current repository is CommonJS JavaScript, Joi, Supabase JS client, Node-owned auth, and Google Gemini for AI.

## Source Files To Read Before Coding

Before editing backend code, read the files relevant to the target module and these shared references:

- `AGENTS.md`
- `.agents/skills/pathfinder-backend-engineer/SKILL.md`
- `.agents/skills/pathfinder-backend-engineer/references/backend-rules.md`
- `.agents/skills/pathfinder-backend-engineer/references/api-conventions.md`
- `.agents/skills/pathfinder-backend-engineer/references/database-reference.md`
- `.agents/skills/pathfinder-backend-engineer/references/module-map.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/DATABASE_SCHEMA_MOCK.json`
- `docs/SUPABASE_SETUP.md`
- `sturcture_explian.md`
- Target module files in `src/modules/<module>/`
- Shared utilities in `src/common/`
- Config files in `src/config/`
- Supabase migrations in `supabase/migrations/`

## Backend Architecture Rules

Follow the existing modular architecture:

```text
route -> controller -> service -> repository -> Supabase/database
```

- Keep each feature inside its module under `src/modules/<module>`.
- Keep shared helpers in `src/common`.
- Keep environment-driven clients/configuration in `src/config`.
- Route files define endpoints and apply middleware only.
- Controllers read HTTP input, call services, and return standardized responses.
- Services contain business logic, orchestration, AI calls, and cross-repository workflows.
- Repositories are the only module files that should perform direct Supabase table queries.
- Schema files define Joi validation rules.
- Do not create random folders outside the existing architecture.

## Module Structure Rules

Prefer the file pattern already scaffolded in modules:

```text
src/modules/<module>/
  <module>.routes.js
  <module>.controller.js
  <module>.service.js
  <module>.repository.js
  <module>.schema.js
```

Some current modules do not have repository or schema files yet. Add those only when that module needs database access or validation. Do not add a repository just to satisfy a pattern if no database access exists.

## API Endpoint Rules

- Implemented base routes mounted in `src/server.js`: `/api/v1/auth`, `/api/v1/users`, `/api/v1/cvs`, `/api/v1/rag`, `/api/v1/roadmaps`, `/api/v1/courses`, `/api/v1/interviews`, `/api/chat`, and `/test`.
- The `/api/v1` prefix is implemented for most product modules. `chat` is currently mounted under `/api/chat`, and `interviews` is mounted twice (`/api/interviews` and `/api/v1/interviews`); prefer `/api/v1` for new work and confirm before consolidating the inconsistent ones.
- Do not mount new public endpoints without confirming the base prefix strategy for the current task.
- Protect user-specific and admin endpoints with `authenticate`.
- Use `authorize('admin')` or role checks only when the role model is confirmed by current schema (`roles`, `users.role_id`) and service logic.
- Keep route names REST-like and module-owned.
- Avoid generic AI endpoints when a feature-specific endpoint is clearer.

## Request Validation Rules

- Validate all endpoints that accept `body`, `params`, or `query`.
- Use the existing Joi middleware in `src/common/middlewares/validate.middleware.js`.
- Put schemas in the module's `*.schema.js` file.
- Use `validateBody`, `validateParams`, and `validateQuery` in route files.
- Do not put validation logic inside controllers or services unless it is a business rule that depends on database state.

## Response Format Rules

Use `src/common/utils/apiResponse.js`.

Success:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "details": {}
}
```

For paginated lists, use `sendPaginated` and `pagination` metadata from `src/common/utils/pagination.js`.

## Error Handling Rules

- Wrap async controllers with `asyncHandler`.
- Throw `AppError` for expected business and validation errors.
- Let unexpected errors flow to `src/common/errors/errorHandler.js`.
- Never expose stack traces or secret values in production responses.
- Every database write must check Supabase `{ data, error }` and convert failures to a clear `AppError`.

## Auth And Security Rules

- Current database docs state that authentication is owned by the Node/Express backend, not Supabase Auth.
- Store only hashed passwords in `users.password_hash`.
- Never return `password_hash` in API responses.
- Never hardcode JWT secrets, API keys, Supabase service role keys, or OpenAI keys.
- Do not copy real `.env` values into docs, commits, logs, or examples.
- The current `auth.middleware.js` falls back to `dev-secret` if `JWT_SECRET` is absent. Future auth work should require `JWT_SECRET` outside local throwaway development.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend code.
- For file uploads, validate MIME type, extension where useful, and size before storing.

## Supabase And Database Rules

- Treat `docs/DATABASE_SCHEMA.md`, `docs/DATABASE_SCHEMA_MOCK.json`, and `supabase/migrations/*` as the database source of truth.
- Do not invent tables, columns, enum values, or workflows.
- If a code task needs a missing field, document it as "Needs confirmation" unless the user explicitly asks for a schema change.
- Use Supabase Storage for binary files only. Store metadata and storage paths in database rows.
- Use service-role Supabase clients only on the backend.
- Keep schema changes in Supabase migrations and verify against local/remote Supabase when credentials are available.
- The current migrations and database schema docs agree on 45 public tables.

## AI Integration Rules

- Current config uses Google Gemini via `src/config/gemini.js`. There is no `src/config/openai.js`.
- Shared AI access goes through `src/modules/ai/ai.service.js` and `src/modules/ai/gemini.service.js` (`generateJsonCompletion`, `embedText`). The `chat` module currently calls the `@google/generative-ai` SDK directly.
- Prompt files live under `src/modules/ai/prompts/`. Implemented: `cvAnalysis.prompt.js`, `roadmap.prompt.js`, `courseAnalysis.prompt.js`. Still empty: `chat.prompt.js`, `coverLetter.prompt.js`, `interview.prompt.js`, `jobMatch.prompt.js`.
- Feature services should call AI through the shared AI/Gemini service wrappers, not directly from controllers.
- Use deterministic code for scores when the feature design calls for deterministic matching; use Gemini for explanations/generation.
- If the schema supports it, AI calls should record model, prompt/response metadata, tokens, cost, latency, status, and error details in `ai_logs`.
- Never log raw secrets. Be careful with full prompts/responses if they contain user personal data.

## Logging Rules

- Use `src/common/utils/logger.js`.
- Log useful lifecycle events and failures, not sensitive payloads.
- Do not use console logging in new feature modules unless the surrounding file already does and the change is temporary.

## Environment Variable Rules

Use `.env.example` as the safe variable-name reference. Never add real values.

Detected env names:

- `PORT`
- `NODE_ENV`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_EMBEDDING_MODEL`
- `GEMINI_EMBEDDING_DIMENSIONS`
- `GEMINI_MAX_OUTPUT_TOKENS`
- `GEMINI_TEMPERATURE`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_MODE`
- `UPLOAD_DIR`
- `STORAGE_BUCKET`
- `STORAGE_ALLOWED_TYPES`
- `STORAGE_MAX_FILE_SIZE`
- `STORAGE_PUBLIC_BASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_USE_ADC`

The previously documented `OPENAI_*` variables are no longer present in `.env` and are no longer used by the code.

Do not document or expose real values.

## Testing Rules

- Current `npm test` is a placeholder that exits with an error.
- For code changes, run syntax checks or targeted manual verification when no test exists.
- When adding tests later, prefer focused API/service tests around changed behavior.
- Document any test gap clearly in the final response.

## Documentation Rules

- Update docs when implementation changes endpoint behavior, schema usage, module ownership, environment variables, or AI logging.
- Do not delete or rewrite existing docs unless explicitly asked.
- If docs conflict with code, document the conflict rather than silently choosing a side.

## What Codex Must Never Do

- Do not modify runtime source code unless the user asks for implementation.
- Do not invent database tables, fields, endpoints, or workflows.
- Do not create business modules outside `src/modules`.
- Do not expose secrets or copy `.env` values.
- Do not use Supabase Auth patterns unless the current task explicitly changes the auth decision.
- Do not create multi-admin RBAC beyond `user` and `admin` unless explicitly requested.
- Do not store uploaded binary files in database rows.
- Do not bypass validation, auth, or standardized error handling.

## Checklist Before Editing Backend Code

- Read this file and the backend skill references.
- Check `git status --short`.
- Inspect the target module, shared middleware, and config files.
- Confirm whether the target behavior is implemented, scaffolded, or only planned.
- Confirm related tables and fields in database docs and migrations.
- Identify validation, auth, response, and error handling needs.
- Plan verification before editing.

## Checklist Before Creating A New Endpoint

- Confirm the route belongs to an existing module.
- Confirm the base prefix strategy for the current task.
- Add or update Joi schemas.
- Apply auth and authorization middleware where required.
- Keep HTTP handling in the controller and business logic in the service.
- Use repositories for Supabase queries.
- Return standardized success/error responses.
- Update API docs/reference if behavior becomes real.

## Checklist Before Changing Database Schema

- Confirm the change is explicitly requested.
- Check `docs/DATABASE_SCHEMA.md`, `docs/DATABASE_SCHEMA_MOCK.json`, and migrations.
- Check whether seed data needs updating.
- Use Supabase migration workflow.
- Consider RLS, storage policies, indexes, constraints, and relationships.
- Verify locally or remotely when credentials/tools are available.
- Update database docs after the migration is confirmed.

## Needs Confirmation

- Whether future runtime code should remain CommonJS JavaScript or migrate to TypeScript.
- Whether API routes should be mounted under `/api/v1`.
- Whether validation should stay on Joi or migrate to Zod.
- Whether auth should continue as Node-owned JWT auth or switch back to Supabase Auth.
- Whether Prisma will be introduced or Supabase JS remains the database layer.
- How production tests should be configured.
