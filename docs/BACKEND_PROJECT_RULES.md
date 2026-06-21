# Backend Project Rules

Use this concise checklist for backend development and agent work.

## Do

- Follow `routes -> controllers -> services -> repositories -> database`.
- Keep each feature in its module under `src/modules`.
- Put shared helpers in `src/common`.
- Put config/client setup in `src/config`.
- Validate all request inputs with Joi middleware.
- Use `AppError`, `asyncHandler`, and standardized response helpers.
- Use Supabase docs/migrations as database truth.
- Protect user and admin endpoints with auth.
- Store files in Storage and metadata in tables.
- Update docs when behavior changes.

## Don't

- Do not invent tables, fields, endpoints, or workflows.
- Do not expose secrets or real `.env` values.
- Do not return `password_hash`.
- Do not create random folders outside the architecture.
- Do not put database queries in controllers.
- Do not add Supabase Auth, Prisma, TypeScript, or Zod unless explicitly requested.
- Do not create multi-admin RBAC beyond `user` and `admin` unless explicitly requested.
- Do not store binary files directly in database rows.

## Endpoint Creation Checklist

- Confirm the module and base path.
- Confirm endpoint is requested and not just planned in old docs.
- Add Joi body/params/query schemas.
- Apply `authenticate` and role authorization where needed.
- Keep route/controller/service/repository responsibilities separate.
- Return `sendSuccess`, `sendPaginated`, or a handled `AppError`.
- Update API docs/reference.
- Verify behavior or document why it could not be verified.

## Database Change Checklist

- Confirm the user explicitly asked for a schema change.
- Check `docs/DATABASE_SCHEMA.md`, `docs/DATABASE_SCHEMA_MOCK.json`, and migrations.
- Create/update Supabase migration files.
- Consider relationships, enum values, indexes, RLS, and storage policies.
- Update seed data if needed.
- Update database docs.
- Run local/remote verification when credentials and tools are available.

## AI Feature Checklist

- Use Google Gemini through shared AI services/config (`src/config/gemini.js`, `src/modules/ai/`).
- Keep prompts in `src/modules/ai/prompts`.
- Validate all AI endpoint inputs.
- Use deterministic scoring where required.
- Log model, feature, prompt/response metadata, tokens, cost, latency, status, and errors to `ai_logs` when supported.
- Avoid logging secrets or unnecessary personal data.

## Supabase Checklist

- Use repository files for Supabase queries.
- Check every `{ data, error }`.
- Use documented table and column names only.
- Keep service role keys server-side.
- Use Storage for files and database rows for metadata.
- Review RLS/API exposure before production use.

## Security Checklist

- Validate all input.
- Authenticate protected routes.
- Authorize admin-only routes.
- Enforce user ownership in services/repositories.
- Hash passwords.
- Omit sensitive fields from responses.
- Avoid logging secrets, tokens, or raw private user data.
- Validate file type and size for uploads.

## Review Checklist

- Correct module?
- Correct layer responsibilities?
- No invented schema?
- Validation added?
- Auth/authorization added?
- Standard response and error handling used?
- Supabase errors handled?
- Docs updated?
- Verification run or test gap reported?
