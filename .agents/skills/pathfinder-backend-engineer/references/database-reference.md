# Database Reference

Use this reference together with `docs/DATABASE_SCHEMA.md`, `docs/DATABASE_SCHEMA_MOCK.json`, and `supabase/migrations/*`. Do not invent schema beyond those files.

## Database Source Of Truth

- `docs/DATABASE_SCHEMA.md`: canonical human-readable schema.
- `docs/DATABASE_SCHEMA_MOCK.json`: structured table, relationship, bucket, and module ownership map.
- `supabase/migrations/20260609233000_init_pathfinder_schema.sql`: initial schema.
- Later migrations add Node auth fields, lookup normalization, course/profile details, interview fields, and cover letter/job screen fields.
- `supabase/seed.sql`: demo data for local/mock usage.

Docs and migrations list the same 45 public tables.

## Extensions And Storage

| Item | Purpose |
| --- | --- |
| `pgcrypto` | UUID generation through `gen_random_uuid()` |
| `vector` | RAG embeddings with Supabase pgvector |

Storage buckets in docs:

| Bucket | Public | Purpose |
| --- | --- | --- |
| `cvs` | No | CV uploads |
| `profile-images` | Yes | Profile photos |
| `interview-recordings` | No | Future interview audio/video |
| `rag-documents` | No | Admin-uploaded RAG source files |

Rule: binary files go to Storage; database rows keep metadata and storage paths.

## Tables And Important Fields

| Table | Important fields |
| --- | --- |
| `roles` | `id`, `name`, `description`, `is_system_role`, timestamps |
| `users` | `id`, `name`, `email`, `password_hash`, `role_id`, `is_active`, `last_login_at`, `last_active_at`, timestamps |
| `profiles` | `user_id`, education/current status/experience lookup ids, `target_career_id`, `headline`, `bio`, avatar fields |
| `profile_experiences` | `profile_id`, job/company fields, dates, `skills`, `display_order` |
| `profile_education` | `profile_id`, institution/degree fields, lookup id, dates, grade |
| `user_preferences` | `user_id`, preferred job/location arrays, salary range, career path ids, metadata |
| `user_achievements` | `user_id`, title/type/issuer/date/certificate/metadata |
| `education_level` | `education_level` |
| `experience_year` | `experience_level` |
| `current_status` | `current_status` |
| `skills` | `name`, `category`, `level`, `aliases`, active flag, audit user ids |
| `user_skills` | `user_id`, `skill_id`, `level` |
| `career_paths` | `title`, `description`, `category`, `average_salary`, `difficulty_level`, active flag |
| `career_path_skills` | `career_path_id`, `skill_id`, `required_level`, `priority` |
| `courses` | title/provider/external id/url/media fields, level/duration/category, category id, outcomes, language, analysis status/confidence, price/rating/popularity |
| `course_categories` | `name`, `icon`, `display_order`, active flag |
| `course_skills` | `course_id`, `skill_id`, confidence, source |
| `saved_courses` | `user_id`, `course_id` |
| `course_enrollments` | `user_id`, `course_id`, `status`, `progress`, enrollment/completion timestamps |
| `cvs` | `user_id`, file URL/path/name/MIME/size, `parsed_text`, `status` |
| `cv_skills` | `cv_id`, `skill_id`, `source` |
| `cv_analyses` | `cv_id`, `score`, `model`, summary arrays/json, `generated_by_type`, review fields |
| `roadmaps` | `user_id`, `career_path_id`, `title`, `description`, `progress`, `status`, `generated_by_type` |
| `roadmap_steps` | `roadmap_id`, `skill_id`, title/description/order/progress/completion fields |
| `jobs` | title/company/location/description/source fields, apply URL, required skills, salary/level/category/media/status/audit |
| `saved_jobs` | `user_id`, `job_id` |
| `applied_jobs` | `user_id`, `job_id`, `cover_letter_id`, `status`, next step fields, notes |
| `job_matches` | `user_id`, `job_id`, `cv_id`, match percentage, matched/missing skills, AI reason, status |
| `chat_sessions` | `user_id`, `title`, `status` |
| `chat_messages` | `session_id`, `sender`, `message`, `tokens` |
| `interview_sessions` | `user_id`, `career_path_id`, `job_id`, status/type/question count/timing/score/feedback/recording |
| `interview_questions` | `interview_session_id`, question/order/answer/feedback/score/status/AI suggestion |
| `cover_letters` | `user_id`, `job_id`, `content`, status/version/language/title/score/tone/target/company/word count/export fields |
| `cover_letter_insights` | `cover_letter_id`, `type`, `message` |
| `cover_letter_versions` | `cover_letter_id`, `content`, `version`, `edited_by_user` |
| `ai_logs` | `user_id`, `feature`, `model`, `prompt`, `response`, tokens/latency/cost/status/error/payloads |
| `rag_documents` | title/type/source/content/storage/vector/index status/active/uploaded by |
| `rag_chunks` | `rag_document_id`, `content`, chunk index, token count, vector/embedding/metadata |
| `api_sources` | provider/base URL/type/schedule/enabled/active/last sync/audit |
| `api_sync_runs` | `api_source_id`, timing/status/raw count/jobs added/updated/rejected/error |
| `system_settings` | key/value/type/description/updated by |
| `notification_settings` | user notification toggles |
| `notifications` | user notification inbox rows |
| `device_tokens` | FCM device registrations |
| `activity_logs` | admin user/action/module/target/old/new/ip/user agent/status |

## Module-To-Table Mapping

| Module | Owns | Reads |
| --- | --- | --- |
| `auth` | `users`, `roles` | `profiles`, `notification_settings` |
| `profiles` | `profiles`, `profile_experiences`, `profile_education`, `user_preferences`, `user_achievements` | `users`, lookups, `career_paths` |
| `skills` | `skills`, `user_skills` | `courses`, `jobs`, `career_paths` |
| `cvs` | `cvs`, `cv_skills` | `skills`, `cv_analyses` |
| `jobs` | `jobs` | `skills`, `api_sync_runs` |
| `savedJobs` | `saved_jobs` | `jobs` |
| `appliedJobs` | `applied_jobs` | `jobs`, `cover_letters` |
| `jobMatches` | `job_matches` | `jobs`, `cvs`, `cv_analyses`, `skills`, `user_skills` |
| `roadmaps` | `roadmaps`, `roadmap_steps` | `career_paths`, `skills`, `courses` |
| `interviews` | `interview_sessions`, `interview_questions` | `jobs`, `career_paths`, `ai_logs` |
| `coverLetters` | `cover_letters`, `cover_letter_insights`, `cover_letter_versions` | `jobs`, `profiles`, `cv_analyses`, `ai_logs` |
| `chat` | `chat_sessions`, `chat_messages` | `rag_documents`, `rag_chunks`, `ai_logs` |
| `notifications` | `notification_settings`, `notifications`, `device_tokens` | `users` |
| `ai` | `ai_logs` | feature-specific tables |

## Schema Change Rules

- Change schema only when the user explicitly requests it.
- Start from existing docs and migrations; do not invent fields.
- Use Supabase migrations for durable schema changes.
- Update `docs/DATABASE_SCHEMA.md` and `docs/DATABASE_SCHEMA_MOCK.json` after a confirmed schema change.
- Review RLS/storage policies and API exposure for new public-schema tables.
- Keep `user` and `admin` as the MVP roles unless the user asks for more.

## Warnings And Inconsistencies

- The handoff mentions Supabase Auth, but current schema/setup says Node-owned auth with `users.password_hash`.
- The handoff mentions TypeScript, Zod, and Prisma, but current repo uses JavaScript CommonJS, Joi, and Supabase JS.
- Product modules are mostly empty; schema existence does not mean runtime API behavior exists.
- `.env.example` documents Firebase, Supabase, Gemini, storage, and JWT variables without real secrets.
- `supabase/migrations/20260610162351_add_course_catalog_user_progress.sql` is present but contains only one line at inspection time.

## Source Files Inspected

- `docs/DATABASE_SCHEMA.md`
- `docs/DATABASE_SCHEMA_MOCK.json`
- `docs/SUPABASE_SETUP.md`
- `supabase/config.toml`
- `supabase/seed.sql`
- all files under `supabase/migrations`
- DB usage scan of `src` files
