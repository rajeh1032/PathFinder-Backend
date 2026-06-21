---
name: pathfinder-backend-engineer
description: Use this skill when working on PathFinder Backend Node.js/Express/Supabase APIs, modules, database operations, validation, auth, AI integrations, and backend documentation.
---

# PathFinder Backend Engineer

Use this skill for any PathFinder Backend task involving Node.js/Express APIs, Supabase database or storage, auth, validation, AI features, module wiring, or backend documentation.

## Required Reading Order

Before coding, read:

1. `AGENTS.md`
2. `.agents/skills/pathfinder-backend-engineer/references/backend-rules.md`
3. `.agents/skills/pathfinder-backend-engineer/references/module-map.md`
4. `.agents/skills/pathfinder-backend-engineer/references/database-reference.md`
5. `.agents/skills/pathfinder-backend-engineer/references/api-conventions.md`
6. The target module files under `src/modules/<module>/`
7. Shared helpers in `src/common/` and config in `src/config/` that the task touches

When the task is documentation-only, read the same references and update docs without editing runtime source.

## Current Architecture To Follow

The backend is CommonJS JavaScript with Express and modular folders:

```text
src/modules/<module>/<module>.routes.js
src/modules/<module>/<module>.controller.js
src/modules/<module>/<module>.service.js
src/modules/<module>/<module>.repository.js
src/modules/<module>/<module>.schema.js
```

Use the existing request flow:

```text
routes -> controllers -> services -> repositories -> Supabase
```

Do not create random folders. Shared code belongs in `src/common`; environment clients/config belong in `src/config`.

## Endpoint Work Rules

- Confirm whether the endpoint is already implemented, scaffolded empty, or only planned in docs.
- Put endpoint declarations and middleware in `*.routes.js`.
- Put request/response handling in `*.controller.js`.
- Put business logic and AI orchestration in `*.service.js`.
- Put Supabase table queries in `*.repository.js`.
- Put Joi schemas in `*.schema.js`.
- Use `sendSuccess`, `sendPaginated`, or the global error handler response shape.
- Apply `authenticate` to protected user endpoints.
- Apply role checks only when the route truly requires admin access.

## Validation Rules

- Every endpoint with body, params, or query input must validate input.
- Use `validateBody`, `validateParams`, and `validateQuery` from `src/common/middlewares/validate.middleware.js`.
- Use Joi unless the user explicitly asks to migrate validation.
- Treat database-dependent checks as service-layer business rules.

## Error Handling Rules

- Wrap async controllers with `asyncHandler`.
- Throw `AppError` for expected failures.
- Convert Supabase errors into clear operational errors.
- Do not leak stack traces, SQL details, tokens, or secrets.

## Supabase Rules

- Treat `docs/DATABASE_SCHEMA.md`, `docs/DATABASE_SCHEMA_MOCK.json`, and `supabase/migrations/*` as schema truth.
- Do not invent tables, columns, enum values, relationships, policies, buckets, or workflows.
- Use Supabase Storage for binary files and database rows for metadata and storage paths.
- Keep service role keys server-only.
- For schema changes, create migrations and update docs only when explicitly requested.

## Auth And Secrets

- Current schema/docs use Node-owned auth with `users.password_hash` and backend JWT.
- Never return `password_hash`.
- Never hardcode `JWT_SECRET`, OpenAI keys, Supabase keys, or provider credentials.
- Never copy real `.env` values into docs or logs.

## AI Feature Rules

- Use Google Gemini through the shared config/services (`src/config/gemini.js`, `src/modules/ai/`).
- Keep prompt templates in `src/modules/ai/prompts/`.
- Use feature-specific endpoints/services when possible.
- Log AI model, prompt/response metadata, token usage, cost, latency, status, and errors to `ai_logs` when supported by the current feature and schema.
- Keep scoring deterministic when feature design says scores should be deterministic and AI should only explain or generate text.

## Documentation And Testing

- Update backend docs when changing endpoints, schema usage, module ownership, auth behavior, AI logging, or env variables.
- Run available verification. If `npm test` is still a placeholder, say so and use targeted alternatives.
- Document unresolved conflicts as "Needs confirmation" instead of guessing.

## Forbidden Actions

- Do not implement product features during documentation-only tasks.
- Do not modify runtime source without explicit request.
- Do not invent schema or endpoint contracts.
- Do not introduce Supabase Auth, Prisma, TypeScript, Zod, or OpenAI just because older handoff docs mention them.
- Do not create multi-admin RBAC beyond `user` and `admin` unless explicitly requested.
