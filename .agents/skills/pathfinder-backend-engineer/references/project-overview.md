# PathFinder Backend Project Overview

## What The Project Does

PathFinder AI is an AI-powered career mentor. It helps students, fresh graduates, ITI students, and career shifters choose career paths, analyze CVs, understand skill gaps, follow learning roadmaps, match with jobs, practice interviews, generate cover letters, and chat with an AI career assistant.

## Main Backend Responsibilities

- Provide Express APIs for mobile app and future admin dashboard clients.
- Persist structured product data in Supabase PostgreSQL.
- Store binary uploads in Supabase Storage or configured local storage.
- Own Node/Express authentication according to current schema docs.
- Validate requests and enforce protected endpoints.
- Orchestrate AI features through Google Gemini.
- Record AI calls and metadata in `ai_logs` when feature workflows are implemented.
- Keep module boundaries clean under `src/modules`.

## User-Facing Features

These features are represented in docs, schema, migrations, seed data, and/or empty module scaffolds:

- Authentication and account management.
- User and profile management.
- Skills and user skills.
- CV uploads, parsing, and AI analysis.
- Career paths and learning content.
- Personalized roadmaps.
- Jobs, saved jobs, applied jobs, and job matches.
- AI mentor chat sessions/messages.
- Interview simulator sessions/questions.
- Cover letter generation, versions, and insights.
- Notification settings.

## Admin And Backend-Managed Features

- Role lookup with `user` and `admin` roles.
- Job catalog and external API source management.
- API sync run tracking.
- System settings.
- Activity logs.
- RAG documents and chunks.
- AI logs.
- Admin review fields for CV analyses.

## AI Features

Planned AI features include:

- CV analysis.
- Career recommendation.
- Roadmap generation.
- Job match explanation.
- Interview question generation and feedback.
- Cover letter generation.
- Chatbot/career mentor.
- RAG-backed answers using Supabase pgvector and Gemini embeddings.

Current code state: Gemini config exists in `src/config/gemini.js`. The shared AI services (`ai.service.js`, `gemini.service.js`) are implemented, and the `cvAnalysis`, `roadmap`, and `courseAnalysis` prompts are implemented. The CV analysis, roadmap generation, course analysis, interview generation, and chat AI features are wired to Gemini. The `chat`, `coverLetter`, `interview`, and `jobMatch` prompt files remain empty placeholders.

## Database Source Of Truth

Use these files together:

- `docs/DATABASE_SCHEMA.md`: human-readable canonical schema.
- `docs/DATABASE_SCHEMA_MOCK.json`: structured schema reference with module ownership.
- `supabase/migrations/*`: applied/target migration history.
- `supabase/seed.sql`: mock/demo data.

At inspection time, the schema docs and migrations agree on 43 public tables.

## Important Docs And How To Use Them

| File | Use |
| --- | --- |
| `AGENTS.md` | Main Codex/project instruction file. |
| `docs/DATABASE_SCHEMA.md` | Canonical database, storage, enum, relationship, and ownership reference. |
| `docs/DATABASE_SCHEMA_MOCK.json` | Machine-readable schema and module ownership reference. |
| `docs/SUPABASE_SETUP.md` | Supabase MCP/CLI setup, current status, and verification queries. |
| `pathfinder_ai_backend_handoff.md` | Product background, intended feature plan, and planned endpoints. Treat older tech decisions as historical when they conflict with code. |
| `sturcture_explian.md` | Layer responsibility guide for routes, controllers, services, repositories, and schemas. |
| `src/common/explanation.md` | Shared utilities and middleware usage. |
| `src/config/explanation.md` | Config modules and environment variables. |

## Source Files Inspected

- `package.json`
- `package-lock.json`
- `.env` variable names only
- `docs/DATABASE_SCHEMA.md`
- `docs/DATABASE_SCHEMA_MOCK.json`
- `docs/SUPABASE_SETUP.md`
- `pathfinder_ai_backend_handoff.md`
- `sturcture_explian.md`
- all project Markdown files outside `node_modules`
- `src/server.js`
- `src/config/*`
- `src/common/*`
- `src/modules/*`
- `supabase/*`

## Needs Confirmation

- Whether the backend should remain CommonJS JavaScript or migrate to TypeScript.
- Whether planned endpoints should be mounted under `/api/v1`.
- Whether validation should remain Joi.
- Whether Node-owned auth remains final despite older handoff references to Supabase Auth.
- Whether Prisma should be introduced later or Supabase JS remains the only data layer.
