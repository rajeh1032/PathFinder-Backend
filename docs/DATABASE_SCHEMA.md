# PathFinder AI Database Schema

This file is the source of truth for every table, relationship, storage bucket, and module/database ownership decision for the PathFinder AI backend.

Sources used:

- `pathfinder_ai_backend_handoff.md`
- Attached Mermaid ERD
- Project architecture rules in `sturcture_explian.md`

## Supabase Decision

Use Supabase PostgreSQL for structured application data, relationships, statuses, AI logs, RAG metadata, and vector embeddings. Supabase is not a NoSQL database, but PostgreSQL gives us `jsonb` columns for flexible AI payloads and extracted CV/job data.

Use Supabase Storage only for binary files:

- CV files
- Profile images
- Interview recordings
- RAG source documents

Do not store uploaded files directly inside database rows. Store metadata, status, and the storage path in database tables.

## Required Extensions

| Extension | Why |
| --- | --- |
| `pgcrypto` | UUID generation with `gen_random_uuid()` |
| `vector` | RAG embeddings through Supabase pgvector |

## Storage Buckets

| Bucket | Public | Purpose | Expected files |
| --- | --- | --- | --- |
| `cvs` | No | User CV uploads | PDF, DOC, DOCX |
| `profile-images` | Yes | User profile photos | JPG, PNG, WebP |
| `interview-recordings` | No | Future voice/video interview recordings | WebM, MP3, MP4, WAV |
| `rag-documents` | No | Admin-uploaded knowledge files | PDF, TXT, Markdown, CSV |

## Status Enums

| Enum | Values |
| --- | --- |
| `app_role` | `user`, `admin` |
| `cv_status` | `uploaded`, `parsing`, `analyzing`, `completed`, `failed` |
| `analysis_status` | `completed`, `failed`, `reviewed` |
| `job_status` | `draft`, `published`, `archived` |
| `job_match_status` | `generated`, `refreshed`, `outdated` |
| `applied_job_status` | `applied`, `viewed`, `interviewing`, `rejected`, `accepted`, `withdrawn` |
| `interview_status` | `started`, `in_progress`, `completed`, `cancelled` |
| `cover_letter_status` | `draft`, `generated`, `edited`, `archived` |
| `roadmap_status` | `active`, `completed`, `paused` |
| `rag_index_status` | `pending`, `indexed`, `failed` |
| `api_sync_status` | `running`, `success`, `failed` |
| `generated_by_type` | `ai`, `admin`, `system`, `user` |

## Tables To Create

### `roles`

Small role lookup table. Keep only `user` and `admin` for MVP.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Unique, maps to `app_role` |
| `description` | `text` | Optional |
| `is_system_role` | `boolean` | Default `true` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `users`

Application user profile linked to Supabase Auth. Do not store passwords here.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, FK to `auth.users.id` |
| `name` | `text` | Display name |
| `email` | `text` | Unique |
| `role_id` | `uuid` | FK to `roles.id` |
| `is_active` | `boolean` | Default `true` |
| `last_login_at` | `timestamptz` | Nullable |
| `last_active_at` | `timestamptz` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `profiles`

One profile per user.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Unique FK to `users.id` |
| `education_level` | `text` | Nullable |
| `university` | `text` | Nullable |
| `major` | `text` | Nullable |
| `current_status` | `text` | Student, graduate, career shifter, etc. |
| `experience_level` | `text` | Beginner, junior, mid, etc. |
| `target_career_id` | `uuid` | FK to `career_paths.id` |
| `location` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `skills`

Canonical skill catalog used by users, CVs, career paths, courses, jobs, and roadmaps.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Unique |
| `category` | `text` | Frontend, backend, soft skill, etc. |
| `level` | `text` | Optional default level |
| `aliases` | `text[]` | Alternate spellings |
| `is_active` | `boolean` | Default `true` |
| `created_by` | `uuid` | FK to `users.id` |
| `updated_by` | `uuid` | FK to `users.id` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `user_skills`

Many-to-many join between users and skills.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK to `users.id` |
| `skill_id` | `uuid` | FK to `skills.id` |
| `level` | `text` | User skill level |
| `created_at` | `timestamptz` | Default `now()` |

Unique key: `user_id`, `skill_id`.

### `career_paths`

Career path catalog.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `title` | `text` | Required |
| `description` | `text` | Nullable |
| `category` | `text` | Required |
| `average_salary` | `text` | Nullable for MVP |
| `difficulty_level` | `text` | Beginner, intermediate, advanced |
| `is_active` | `boolean` | Default `true` |
| `created_by` | `uuid` | FK to `users.id` |
| `updated_by` | `uuid` | FK to `users.id` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `career_path_skills`

Many-to-many join between career paths and required skills.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `career_path_id` | `uuid` | FK to `career_paths.id` |
| `skill_id` | `uuid` | FK to `skills.id` |
| `required_level` | `text` | Required level |
| `priority` | `integer` | Lower number means higher priority |

Unique key: `career_path_id`, `skill_id`.

### `courses`

Learning content catalog. For MVP, a course has one `video_url`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `title` | `text` | Required |
| `provider` | `text` | Required |
| `url` | `text` | Course URL |
| `thumbnail_url` | `text` | Optional |
| `video_url` | `text` | Optional MVP video link |
| `level` | `text` | Beginner, intermediate, advanced |
| `duration` | `text` | Human-readable duration |
| `category` | `text` | Required |
| `is_active` | `boolean` | Default `true` |
| `created_by` | `uuid` | FK to `users.id` |
| `updated_by` | `uuid` | FK to `users.id` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `course_skills`

Required missing table from the handoff. Connects courses to the skills they teach.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `course_id` | `uuid` | FK to `courses.id` |
| `skill_id` | `uuid` | FK to `skills.id` |
| `created_at` | `timestamptz` | Default `now()` |

Unique key: `course_id`, `skill_id`.

### `cvs`

CV upload metadata and parsing status.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK to `users.id` |
| `file_url` | `text` | Public/signed URL if generated |
| `storage_path` | `text` | Supabase Storage object path |
| `original_name` | `text` | Original upload filename |
| `mime_type` | `text` | File MIME type |
| `size_bytes` | `bigint` | File size |
| `parsed_text` | `text` | Extracted CV text |
| `status` | `cv_status` | Upload/analysis lifecycle |
| `uploaded_at` | `timestamptz` | Default `now()` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `cv_skills`

Skills extracted from a CV.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `cv_id` | `uuid` | FK to `cvs.id` |
| `skill_id` | `uuid` | FK to `skills.id` |
| `source` | `text` | `parser`, `ai`, or `manual` |
| `created_at` | `timestamptz` | Default `now()` |

Unique key: `cv_id`, `skill_id`.

### `cv_analyses`

AI-generated analysis for a CV. Admin can review, approve, or flag.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `cv_id` | `uuid` | Unique FK to `cvs.id` |
| `score` | `integer` | 0 to 100 |
| `model` | `text` | OpenAI model |
| `summary` | `text` | AI summary |
| `strengths` | `jsonb` | Array |
| `weaknesses` | `jsonb` | Array |
| `suggestions` | `jsonb` | Array |
| `detected_skills` | `jsonb` | Array |
| `extracted` | `jsonb` | Structured parsed data |
| `generated_by_type` | `generated_by_type` | Usually `ai` |
| `status` | `analysis_status` | Review lifecycle |
| `reviewed_by_admin_id` | `uuid` | FK to `users.id` |
| `created_at` | `timestamptz` | Default `now()` |
| `reviewed_at` | `timestamptz` | Nullable |

### `roadmaps`

Personalized learning roadmap for a user.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK to `users.id` |
| `career_path_id` | `uuid` | FK to `career_paths.id` |
| `title` | `text` | Required |
| `description` | `text` | Nullable |
| `progress` | `integer` | 0 to 100 |
| `status` | `roadmap_status` | Default `active` |
| `generated_by_type` | `generated_by_type` | `ai`, `admin`, or `system` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `roadmap_steps`

Steps inside a roadmap.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `roadmap_id` | `uuid` | FK to `roadmaps.id` |
| `skill_id` | `uuid` | FK to `skills.id` |
| `title` | `text` | Required |
| `description` | `text` | Nullable |
| `step_order` | `integer` | Required |
| `progress` | `integer` | 0 to 100 |
| `is_completed` | `boolean` | Default `false` |
| `completed_at` | `timestamptz` | Nullable |

Unique key: `roadmap_id`, `step_order`.

### `jobs`

Normalized job listings from admin and external APIs.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `title` | `text` | Required |
| `company` | `text` | Required |
| `location` | `text` | Nullable |
| `description` | `text` | Required |
| `source` | `text` | Manual, Adzuna, JSearch, Remotive |
| `source_type` | `text` | `manual` or `api` |
| `external_id` | `text` | External provider id |
| `apply_url` | `text` | Nullable |
| `required_skills` | `jsonb` | Array of required skills |
| `employment_type` | `text` | Full-time, internship, remote, etc. |
| `salary_range` | `text` | Nullable |
| `is_active` | `boolean` | Default `true` |
| `status` | `job_status` | `draft`, `published`, `archived` |
| `created_by` | `uuid` | FK to `users.id` |
| `updated_by` | `uuid` | FK to `users.id` |
| `posted_at` | `timestamptz` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `saved_jobs`

User saved jobs.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK to `users.id` |
| `job_id` | `uuid` | FK to `jobs.id` |
| `created_at` | `timestamptz` | Default `now()` |

Unique key: `user_id`, `job_id`.

### `applied_jobs`

User job application tracking.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK to `users.id` |
| `job_id` | `uuid` | FK to `jobs.id` |
| `status` | `applied_job_status` | Application lifecycle |
| `applied_at` | `timestamptz` | Default `now()` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

Unique key: `user_id`, `job_id`.

### `job_matches`

Deterministic match score plus AI explanation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK to `users.id` |
| `job_id` | `uuid` | FK to `jobs.id` |
| `cv_id` | `uuid` | FK to `cvs.id` |
| `match_percentage` | `integer` | 0 to 100 |
| `matched_skills` | `jsonb` | Array |
| `missing_skills` | `jsonb` | Array |
| `ai_reason` | `text` | Explanation only |
| `generated_by_type` | `generated_by_type` | Usually `ai` or `system` |
| `status` | `job_match_status` | Lifecycle |
| `created_at` | `timestamptz` | Default `now()` |

### `chat_sessions`

AI mentor chat session.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK to `users.id` |
| `title` | `text` | Nullable |
| `status` | `text` | `active`, `archived`, `deleted` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `chat_messages`

Messages inside a chat session.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `session_id` | `uuid` | FK to `chat_sessions.id` |
| `sender` | `text` | `user`, `assistant`, `system` |
| `message` | `text` | Message content |
| `tokens` | `integer` | Token count |
| `created_at` | `timestamptz` | Default `now()` |

### `interview_sessions`

AI interview attempt.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK to `users.id` |
| `career_path_id` | `uuid` | FK to `career_paths.id` |
| `job_id` | `uuid` | FK to `jobs.id` |
| `status` | `interview_status` | Lifecycle |
| `overall_score` | `integer` | 0 to 100 |
| `score_breakdown` | `jsonb` | Structured scores |
| `feedback_text` | `text` | Final feedback |
| `recording_url` | `text` | Storage URL/path |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `interview_questions`

Questions and answers inside an interview session.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `interview_session_id` | `uuid` | FK to `interview_sessions.id` |
| `question` | `text` | Required |
| `user_answer` | `text` | Nullable |
| `feedback` | `text` | Nullable |
| `score` | `integer` | 0 to 100 |
| `generated_by_type` | `generated_by_type` | Usually `ai` |

### `cover_letters`

Generated/editable cover letters.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK to `users.id` |
| `job_id` | `uuid` | FK to `jobs.id` |
| `content` | `text` | Current content |
| `status` | `cover_letter_status` | Lifecycle |
| `version` | `integer` | Current version number |
| `language` | `text` | Example: `en`, `ar` |
| `generated_by_type` | `generated_by_type` | Usually `ai` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `cover_letter_versions`

Optional but created for full edit history.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `cover_letter_id` | `uuid` | FK to `cover_letters.id` |
| `content` | `text` | Version content |
| `version` | `integer` | Version number |
| `edited_by_user` | `boolean` | Whether user edited it |
| `created_at` | `timestamptz` | Default `now()` |

Unique key: `cover_letter_id`, `version`.

### `ai_logs`

Trace every OpenAI call for cost, debugging, and safety.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK to `users.id` |
| `feature` | `text` | CV analysis, chat, cover letter, etc. |
| `model` | `text` | OpenAI model |
| `prompt` | `text` | Prompt sent |
| `response` | `text` | Model response |
| `tokens_used` | `integer` | Nullable |
| `latency_ms` | `integer` | Nullable |
| `cost` | `numeric(12,6)` | Nullable |
| `status` | `text` | `success`, `failed` |
| `error_message` | `text` | Nullable |
| `request_payload` | `jsonb` | Full request metadata |
| `response_payload` | `jsonb` | Full response metadata |
| `created_at` | `timestamptz` | Default `now()` |

### `rag_documents`

Documents indexed for RAG.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `title` | `text` | Required |
| `type` | `text` | CV rule, course data, job data, admin doc |
| `source` | `text` | Upload/API/manual |
| `content` | `text` | Extracted full text |
| `storage_path` | `text` | Optional source file path |
| `vector_id` | `text` | Optional external id |
| `index_status` | `rag_index_status` | Pending/indexed/failed |
| `index_error` | `text` | Nullable |
| `is_active` | `boolean` | Default `true` |
| `uploaded_by` | `uuid` | FK to `users.id` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `rag_chunks`

Chunked RAG content with pgvector embedding.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `rag_document_id` | `uuid` | FK to `rag_documents.id` |
| `content` | `text` | Chunk content |
| `chunk_index` | `integer` | Chunk order |
| `token_count` | `integer` | Approximate tokens |
| `vector_id` | `text` | Optional external id |
| `embedding` | `vector(1536)` | OpenAI `text-embedding-3-small` |
| `metadata` | `jsonb` | Search metadata |
| `created_at` | `timestamptz` | Default `now()` |

Unique key: `rag_document_id`, `chunk_index`.

### `api_sources`

External job API source configuration.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Required |
| `provider` | `text` | Adzuna, JSearch, Remotive |
| `base_url` | `text` | Required |
| `type` | `text` | `jobs`, `courses`, etc. |
| `schedule_cron` | `text` | Nullable |
| `enabled` | `boolean` | Default `true` |
| `is_active` | `boolean` | Default `true` |
| `last_sync_at` | `timestamptz` | Nullable |
| `created_by` | `uuid` | FK to `users.id` |
| `updated_by` | `uuid` | FK to `users.id` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `api_sync_runs`

History of external API sync runs.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `api_source_id` | `uuid` | FK to `api_sources.id` |
| `started_at` | `timestamptz` | Default `now()` |
| `finished_at` | `timestamptz` | Nullable |
| `status` | `api_sync_status` | Running/success/failed |
| `raw_response_count` | `integer` | Added from handoff recommendation |
| `jobs_added` | `integer` | Default `0` |
| `jobs_updated` | `integer` | Default `0` |
| `jobs_rejected` | `integer` | Added from handoff recommendation |
| `error_message` | `text` | Nullable |

### `system_settings`

Admin-controlled system settings.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `setting_key` | `text` | Unique |
| `setting_value` | `jsonb` | Flexible setting payload |
| `type` | `text` | String, number, boolean, json |
| `description` | `text` | Optional |
| `updated_by` | `uuid` | FK to `users.id` |
| `updated_at` | `timestamptz` | Default `now()` |

### `notification_settings`

One settings row per user.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Unique FK to `users.id` |
| `push_enabled` | `boolean` | Default `true` |
| `email_enabled` | `boolean` | Default `true` |
| `job_alerts_enabled` | `boolean` | Default `true` |
| `roadmap_reminders_enabled` | `boolean` | Default `true` |
| `interview_reminders_enabled` | `boolean` | Default `true` |
| `ai_tips_enabled` | `boolean` | Default `true` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `activity_logs`

Admin and system audit trail.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `admin_user_id` | `uuid` | FK to `users.id` |
| `action` | `text` | Required |
| `module` | `text` | Required |
| `target_id` | `uuid` | Nullable |
| `target_type` | `text` | Nullable |
| `old_data` | `jsonb` | Nullable |
| `new_data` | `jsonb` | Nullable |
| `ip_address` | `text` | Nullable |
| `user_agent` | `text` | Nullable |
| `status` | `text` | `success` or `failed` |
| `created_at` | `timestamptz` | Default `now()` |

## Relationship Summary

| From | To | Type |
| --- | --- | --- |
| `roles` | `users` | One-to-many |
| `users` | `profiles` | One-to-one |
| `career_paths` | `profiles` | One-to-many target career |
| `users` | `user_skills` | One-to-many |
| `skills` | `user_skills` | One-to-many |
| `cvs` | `cv_skills` | One-to-many |
| `skills` | `cv_skills` | One-to-many |
| `career_paths` | `career_path_skills` | One-to-many |
| `skills` | `career_path_skills` | One-to-many |
| `courses` | `course_skills` | One-to-many |
| `skills` | `course_skills` | One-to-many |
| `users` | `cvs` | One-to-many |
| `cvs` | `cv_analyses` | One-to-one |
| `users` | `roadmaps` | One-to-many |
| `career_paths` | `roadmaps` | One-to-many |
| `roadmaps` | `roadmap_steps` | One-to-many |
| `skills` | `roadmap_steps` | One-to-many |
| `users` | `saved_jobs` | One-to-many |
| `jobs` | `saved_jobs` | One-to-many |
| `users` | `applied_jobs` | One-to-many |
| `jobs` | `applied_jobs` | One-to-many |
| `users` | `job_matches` | One-to-many |
| `jobs` | `job_matches` | One-to-many |
| `cvs` | `job_matches` | One-to-many |
| `users` | `chat_sessions` | One-to-many |
| `chat_sessions` | `chat_messages` | One-to-many |
| `users` | `interview_sessions` | One-to-many |
| `career_paths` | `interview_sessions` | One-to-many |
| `jobs` | `interview_sessions` | One-to-many |
| `interview_sessions` | `interview_questions` | One-to-many |
| `users` | `cover_letters` | One-to-many |
| `jobs` | `cover_letters` | One-to-many |
| `cover_letters` | `cover_letter_versions` | One-to-many |
| `users` | `ai_logs` | One-to-many |
| `rag_documents` | `rag_chunks` | One-to-many |
| `api_sources` | `api_sync_runs` | One-to-many |
| `users` | `notification_settings` | One-to-one |
| `users` | `activity_logs` | One-to-many admin actions |

## Module Ownership Checklist

Use this checklist before creating any module. A module is correct only if it touches the tables assigned to it and keeps request flow as routes -> controller -> service -> repository.

| Module | Own Tables | May Read |
| --- | --- | --- |
| `auth` | `users`, `roles` | `profiles`, `notification_settings` |
| `users` | `users`, `activity_logs` | `profiles`, `user_skills` |
| `profiles` | `profiles` | `users`, `career_paths` |
| `skills` | `skills`, `user_skills` | `courses`, `jobs`, `career_paths` |
| `careerPaths` | `career_paths`, `career_path_skills` | `skills`, `courses` |
| `courses` | `courses`, `course_skills` | `skills`, `career_paths` |
| `cvs` | `cvs`, `cv_skills` | `skills`, `cv_analyses` |
| `cvAnalyses` | `cv_analyses` | `cvs`, `skills`, `ai_logs` |
| `jobs` | `jobs` | `skills`, `api_sync_runs` |
| `savedJobs` | `saved_jobs` | `jobs` |
| `appliedJobs` | `applied_jobs` | `jobs` |
| `jobMatches` | `job_matches` | `jobs`, `cvs`, `cv_analyses`, `skills`, `user_skills` |
| `roadmaps` | `roadmaps`, `roadmap_steps` | `career_paths`, `skills`, `courses` |
| `interviews` | `interview_sessions`, `interview_questions` | `jobs`, `career_paths`, `ai_logs` |
| `coverLetters` | `cover_letters`, `cover_letter_versions` | `jobs`, `profiles`, `cv_analyses`, `ai_logs` |
| `chat` | `chat_sessions`, `chat_messages` | `rag_documents`, `rag_chunks`, `ai_logs` |
| `notifications` | `notification_settings` | `users` |
| `ai` | `ai_logs` | Feature tables that requested the AI action |
| `rag` | `rag_documents`, `rag_chunks` | `ai_logs` |
| `apiSources` | `api_sources`, `api_sync_runs` | `jobs` |
| `settings` | `system_settings` | `users` |
| `activityLogs` | `activity_logs` | `users` |

## Future Module Validation Rule

Before implementing any module, compare it against:

1. This file.
2. `docs/DATABASE_SCHEMA_MOCK.json`.
3. `supabase/migrations/20260609233000_init_pathfinder_schema.sql`.

The module should not invent tables, direct database access from controllers, or relationships that are not present here unless this document and the migration are updated first.
