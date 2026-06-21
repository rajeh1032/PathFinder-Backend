# Backend Rules

These rules are strict for future backend work in this repository.

## Architecture Rules

- Keep the flow `routes -> controllers -> services -> repositories -> database`.
- Keep product code under `src/modules/<module>`.
- Keep shared code under `src/common`.
- Keep environment clients/config under `src/config`.
- Do not add new architecture layers or folders unless the user requests a broader refactor.
- Do not move existing files during feature work unless necessary and approved.

## Coding Style Rules

- Follow current CommonJS style: `require` and `module.exports`.
- Use the existing utility names and response helpers.
- Keep functions focused and module-local.
- Add comments only when a non-obvious block needs orientation.
- Do not introduce TypeScript, Prisma, Zod, or a new logger without explicit approval.

## Security Rules

- Never expose or log secrets.
- Never return `password_hash`.
- Validate every request input.
- Protect all user-owned resources with auth and ownership checks.
- Protect admin-only operations with role checks.
- Keep service role Supabase clients on the server only.
- Validate file type and size before accepting uploads.

## Supabase Rules

- Query Supabase from repositories, not controllers.
- Check every Supabase error result.
- Use documented table names and fields only.
- Store binary files in Storage and metadata in database rows.
- Review storage bucket privacy before generating public URLs.
- Use migrations for schema changes and update schema docs afterward.
- For exposed public-schema tables, consider RLS and API grants before production use.

## AI Prompt And Logging Rules

- Keep prompt templates in `src/modules/ai/prompts`.
- Keep Gemini client setup in `src/config/gemini.js`. There is no `src/config/openai.js`.
- Centralize AI calls through the AI services (`src/modules/ai/ai.service.js`, `gemini.service.js`).
- Log AI call metadata to `ai_logs` when the workflow is implemented and schema supports it.
- Do not log raw secrets or unnecessary personal data.
- Do not let AI invent database records, statuses, or schema values.

## File Naming Rules

- Use existing plural module names: `users`, `profiles`, `cvs`, `jobs`, etc.
- Use existing file suffixes: `.routes.js`, `.controller.js`, `.service.js`, `.repository.js`, `.schema.js`.
- Use `src/common` for shared middleware/utilities/errors.
- Use `src/config` for environment-backed clients.

## Module Boundary Rules

- A module may read another module's tables only when documented in module ownership.
- Cross-module workflows belong in services.
- Avoid circular imports between modules.
- Do not put product-specific logic in `src/common`.

## Testing Rules

- Check `npm test` before claiming test coverage. It currently exits with "Error: no test specified".
- Use targeted manual/syntax verification when tests are absent.
- Add tests only when the task asks for implementation or when risk justifies it.
- Report test gaps clearly.

## Documentation Rules

- Update docs when endpoint contracts, schema usage, auth behavior, env vars, AI logging, or module ownership changes.
- Mark uncertain areas as "Needs confirmation".
- Do not rewrite existing docs wholesale without explicit request.

## Forbidden Actions

- Do not modify runtime source during documentation-only tasks.
- Do not invent database schema or endpoint contracts.
- Do not create multi-admin RBAC beyond `user` and `admin` without explicit request.
- Do not switch to Supabase Auth unless the user asks for an auth architecture change.
- Do not store uploaded files directly in database rows.
- Do not bypass validation or error handling to move faster.

## Review Checklist

- Does the route belong to the right module?
- Is input validated?
- Is auth/authorization correct?
- Are Supabase queries isolated in repositories?
- Are writes checked for errors?
- Is the response standardized?
- Are secrets protected?
- Are docs updated if behavior changed?
- Was verification run or was the gap reported?
