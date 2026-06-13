alter table public.profiles
  add column if not exists headline text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists avatar_storage_path text;

create table if not exists public.profile_experiences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_title text not null,
  company_name text not null,
  employment_type text,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  skills jsonb not null default '[]'::jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_experiences_date_check check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.profile_education (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  institution text not null,
  degree text,
  field_of_study text,
  education_level_id uuid references public.education_level(id) on delete set null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  grade text,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_education_date_check check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  preferred_job_types jsonb not null default '[]'::jsonb,
  preferred_locations jsonb not null default '[]'::jsonb,
  remote_preference text,
  salary_expectation_min numeric(12, 2),
  salary_expectation_max numeric(12, 2),
  salary_currency text,
  preferred_career_path_ids uuid[] not null default '{}',
  learning_goal text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_salary_check check (
    salary_expectation_min is null
    or salary_expectation_max is null
    or salary_expectation_max >= salary_expectation_min
  )
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  achievement_type text,
  issuer text,
  issued_at date,
  certificate_url text,
  metadata jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profile_experiences_updated_at on public.profile_experiences;
create trigger set_profile_experiences_updated_at
before update on public.profile_experiences
for each row execute function public.set_updated_at();

drop trigger if exists set_profile_education_updated_at on public.profile_education;
create trigger set_profile_education_updated_at
before update on public.profile_education
for each row execute function public.set_updated_at();

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_user_achievements_updated_at on public.user_achievements;
create trigger set_user_achievements_updated_at
before update on public.user_achievements
for each row execute function public.set_updated_at();

create index if not exists idx_profile_experiences_profile_id on public.profile_experiences(profile_id);
create index if not exists idx_profile_experiences_is_current on public.profile_experiences(is_current);
create index if not exists idx_profile_education_profile_id on public.profile_education(profile_id);
create index if not exists idx_user_preferences_user_id on public.user_preferences(user_id);
create index if not exists idx_user_achievements_user_id on public.user_achievements(user_id);
create index if not exists idx_user_achievements_type on public.user_achievements(achievement_type);

alter table public.profile_experiences enable row level security;
alter table public.profile_education enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_achievements enable row level security;
