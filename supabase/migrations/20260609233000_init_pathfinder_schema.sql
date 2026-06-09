create extension if not exists pgcrypto;
create extension if not exists vector;

do $$ begin
  create type app_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type generated_by_type as enum ('ai', 'admin', 'system', 'user');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type cv_status as enum ('uploaded', 'parsing', 'analyzing', 'completed', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type analysis_status as enum ('completed', 'failed', 'reviewed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type job_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type job_match_status as enum ('generated', 'refreshed', 'outdated');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type applied_job_status as enum ('applied', 'viewed', 'interviewing', 'rejected', 'accepted', 'withdrawn');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type interview_status as enum ('started', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type cover_letter_status as enum ('draft', 'generated', 'edited', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type roadmap_status as enum ('active', 'completed', 'paused');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type rag_index_status as enum ('pending', 'indexed', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type api_sync_status as enum ('running', 'success', 'failed');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name app_role not null unique,
  description text,
  is_system_role boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role_id uuid references public.roles(id) on delete set null,
  is_active boolean not null default true,
  last_login_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_paths (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  average_salary text,
  difficulty_level text,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  education_level text,
  university text,
  major text,
  current_status text,
  experience_level text,
  target_career_id uuid references public.career_paths(id) on delete set null,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  level text,
  aliases text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  level text,
  created_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

create table if not exists public.cv_skills (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null,
  skill_id uuid not null references public.skills(id) on delete cascade,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.career_path_skills (
  id uuid primary key default gen_random_uuid(),
  career_path_id uuid not null references public.career_paths(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  required_level text,
  priority integer not null default 0,
  unique (career_path_id, skill_id)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  provider text not null,
  url text,
  thumbnail_url text,
  video_url text,
  level text,
  duration text,
  category text,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_skills (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (course_id, skill_id)
);

create table if not exists public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  file_url text,
  storage_path text,
  original_name text,
  mime_type text,
  size_bytes bigint,
  parsed_text text,
  status cv_status not null default 'uploaded',
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cv_skills
  add constraint cv_skills_cv_id_fkey
  foreign key (cv_id) references public.cvs(id) on delete cascade;

alter table public.cv_skills
  add constraint cv_skills_cv_skill_unique unique (cv_id, skill_id);

create table if not exists public.cv_analyses (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null unique references public.cvs(id) on delete cascade,
  score integer check (score between 0 and 100),
  model text,
  summary text,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  detected_skills jsonb not null default '[]'::jsonb,
  extracted jsonb not null default '{}'::jsonb,
  generated_by_type generated_by_type not null default 'ai',
  status analysis_status not null default 'completed',
  reviewed_by_admin_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  career_path_id uuid references public.career_paths(id) on delete set null,
  title text not null,
  description text,
  progress integer not null default 0 check (progress between 0 and 100),
  status roadmap_status not null default 'active',
  generated_by_type generated_by_type not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_steps (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete set null,
  title text not null,
  description text,
  step_order integer not null,
  progress integer not null default 0 check (progress between 0 and 100),
  is_completed boolean not null default false,
  completed_at timestamptz,
  unique (roadmap_id, step_order)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text,
  description text not null,
  source text,
  source_type text,
  external_id text,
  apply_url text,
  required_skills jsonb not null default '[]'::jsonb,
  employment_type text,
  salary_range text,
  is_active boolean not null default true,
  status job_status not null default 'draft',
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists public.applied_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status applied_job_status not null default 'applied',
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  cv_id uuid references public.cvs(id) on delete set null,
  match_percentage integer not null check (match_percentage between 0 and 100),
  matched_skills jsonb not null default '[]'::jsonb,
  missing_skills jsonb not null default '[]'::jsonb,
  ai_reason text,
  generated_by_type generated_by_type not null default 'system',
  status job_match_status not null default 'generated',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text,
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender text not null check (sender in ('user', 'assistant', 'system')),
  message text not null,
  tokens integer,
  created_at timestamptz not null default now()
);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  career_path_id uuid references public.career_paths(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  status interview_status not null default 'started',
  overall_score integer check (overall_score between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  feedback_text text,
  recording_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_session_id uuid not null references public.interview_sessions(id) on delete cascade,
  question text not null,
  user_answer text,
  feedback text,
  score integer check (score between 0 and 100),
  generated_by_type generated_by_type not null default 'ai'
);

create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  content text not null,
  status cover_letter_status not null default 'generated',
  version integer not null default 1,
  language text not null default 'en',
  generated_by_type generated_by_type not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cover_letter_versions (
  id uuid primary key default gen_random_uuid(),
  cover_letter_id uuid not null references public.cover_letters(id) on delete cascade,
  content text not null,
  version integer not null,
  edited_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  unique (cover_letter_id, version)
);

create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  feature text not null,
  model text,
  prompt text,
  response text,
  tokens_used integer,
  latency_ms integer,
  cost numeric(12, 6),
  status text not null default 'success' check (status in ('success', 'failed')),
  error_message text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text,
  source text,
  content text,
  storage_path text,
  vector_id text,
  index_status rag_index_status not null default 'pending',
  index_error text,
  is_active boolean not null default true,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  rag_document_id uuid not null references public.rag_documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  token_count integer,
  vector_id text,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (rag_document_id, chunk_index)
);

create table if not exists public.api_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  base_url text not null,
  type text not null,
  schedule_cron text,
  enabled boolean not null default true,
  is_active boolean not null default true,
  last_sync_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_sync_runs (
  id uuid primary key default gen_random_uuid(),
  api_source_id uuid not null references public.api_sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status api_sync_status not null default 'running',
  raw_response_count integer not null default 0,
  jobs_added integer not null default 0,
  jobs_updated integer not null default 0,
  jobs_rejected integer not null default 0,
  error_message text
);

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}'::jsonb,
  type text,
  description text,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  job_alerts_enabled boolean not null default true,
  roadmap_reminders_enabled boolean not null default true,
  interview_reminders_enabled boolean not null default true,
  ai_tips_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.users(id) on delete set null,
  action text not null,
  module text not null,
  target_id uuid,
  target_type text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  status text not null default 'success' check (status in ('success', 'failed')),
  created_at timestamptz not null default now()
);

insert into public.roles (name, description, is_system_role)
values
  ('user', 'Default application user', true),
  ('admin', 'Application administrator', true)
on conflict (name) do update set
  description = excluded.description,
  is_system_role = excluded.is_system_role,
  updated_at = now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('cvs', 'cvs', false, 10485760, array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  ('profile-images', 'profile-images', true, 5242880, array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]),
  ('interview-recordings', 'interview-recordings', false, 104857600, array[
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'video/mp4',
    'video/webm'
  ]),
  ('rag-documents', 'rag-documents', false, 20971520, array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv'
  ])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists idx_users_role_id on public.users(role_id);
create index if not exists idx_profiles_target_career_id on public.profiles(target_career_id);
create index if not exists idx_user_skills_user_id on public.user_skills(user_id);
create index if not exists idx_user_skills_skill_id on public.user_skills(skill_id);
create index if not exists idx_cv_skills_cv_id on public.cv_skills(cv_id);
create index if not exists idx_cv_skills_skill_id on public.cv_skills(skill_id);
create index if not exists idx_career_path_skills_career_path_id on public.career_path_skills(career_path_id);
create index if not exists idx_course_skills_course_id on public.course_skills(course_id);
create index if not exists idx_cvs_user_id on public.cvs(user_id);
create index if not exists idx_roadmaps_user_id on public.roadmaps(user_id);
create index if not exists idx_roadmap_steps_roadmap_id on public.roadmap_steps(roadmap_id);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_jobs_source_external_id on public.jobs(source, external_id);
create index if not exists idx_saved_jobs_user_id on public.saved_jobs(user_id);
create index if not exists idx_applied_jobs_user_id on public.applied_jobs(user_id);
create index if not exists idx_job_matches_user_id on public.job_matches(user_id);
create index if not exists idx_chat_sessions_user_id on public.chat_sessions(user_id);
create index if not exists idx_chat_messages_session_id on public.chat_messages(session_id);
create index if not exists idx_interview_sessions_user_id on public.interview_sessions(user_id);
create index if not exists idx_cover_letters_user_id on public.cover_letters(user_id);
create index if not exists idx_ai_logs_user_id on public.ai_logs(user_id);
create index if not exists idx_ai_logs_feature on public.ai_logs(feature);
create index if not exists idx_rag_documents_index_status on public.rag_documents(index_status);
create index if not exists idx_rag_chunks_document_id on public.rag_chunks(rag_document_id);
create index if not exists idx_api_sync_runs_source_id on public.api_sync_runs(api_source_id);
create index if not exists idx_activity_logs_admin_user_id on public.activity_logs(admin_user_id);

create index if not exists idx_rag_chunks_embedding
  on public.rag_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles',
    'users',
    'profiles',
    'skills',
    'user_skills',
    'cv_skills',
    'career_paths',
    'career_path_skills',
    'courses',
    'course_skills',
    'cvs',
    'cv_analyses',
    'roadmaps',
    'roadmap_steps',
    'jobs',
    'saved_jobs',
    'applied_jobs',
    'job_matches',
    'chat_sessions',
    'chat_messages',
    'interview_sessions',
    'interview_questions',
    'cover_letters',
    'cover_letter_versions',
    'ai_logs',
    'rag_documents',
    'rag_chunks',
    'api_sources',
    'api_sync_runs',
    'system_settings',
    'notification_settings',
    'activity_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop trigger if exists set_roles_updated_at on public.roles;
create trigger set_roles_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_skills_updated_at on public.skills;
create trigger set_skills_updated_at
before update on public.skills
for each row execute function public.set_updated_at();

drop trigger if exists set_career_paths_updated_at on public.career_paths;
create trigger set_career_paths_updated_at
before update on public.career_paths
for each row execute function public.set_updated_at();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists set_cvs_updated_at on public.cvs;
create trigger set_cvs_updated_at
before update on public.cvs
for each row execute function public.set_updated_at();

drop trigger if exists set_roadmaps_updated_at on public.roadmaps;
create trigger set_roadmaps_updated_at
before update on public.roadmaps
for each row execute function public.set_updated_at();

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_applied_jobs_updated_at on public.applied_jobs;
create trigger set_applied_jobs_updated_at
before update on public.applied_jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_chat_sessions_updated_at on public.chat_sessions;
create trigger set_chat_sessions_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_interview_sessions_updated_at on public.interview_sessions;
create trigger set_interview_sessions_updated_at
before update on public.interview_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_cover_letters_updated_at on public.cover_letters;
create trigger set_cover_letters_updated_at
before update on public.cover_letters
for each row execute function public.set_updated_at();

drop trigger if exists set_rag_documents_updated_at on public.rag_documents;
create trigger set_rag_documents_updated_at
before update on public.rag_documents
for each row execute function public.set_updated_at();

drop trigger if exists set_api_sources_updated_at on public.api_sources;
create trigger set_api_sources_updated_at
before update on public.api_sources
for each row execute function public.set_updated_at();

drop trigger if exists set_notification_settings_updated_at on public.notification_settings;
create trigger set_notification_settings_updated_at
before update on public.notification_settings
for each row execute function public.set_updated_at();

-- RLS is enabled above. The backend should use the service role key server-side.
-- Add user-facing policies per module before exposing direct Supabase client access.
