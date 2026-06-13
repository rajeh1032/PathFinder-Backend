alter table public.jobs
  add column if not exists level text,
  add column if not exists category text,
  add column if not exists thumbnail_url text,
  add column if not exists company_logo_url text,
  add column if not exists certificate_provider text,
  add column if not exists duration text;

alter table public.applied_jobs
  add column if not exists cover_letter_id uuid references public.cover_letters(id),
  add column if not exists next_step text,
  add column if not exists next_step_at timestamptz,
  add column if not exists notes text;

alter table public.cover_letters
  add column if not exists title text,
  add column if not exists score integer,
  add column if not exists tone text,
  add column if not exists target_role text,
  add column if not exists company_name text,
  add column if not exists word_count integer,
  add column if not exists last_edited_at timestamptz,
  add column if not exists exported_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cover_letters_score_check'
  ) then
    alter table public.cover_letters
      add constraint cover_letters_score_check
      check (score is null or (score >= 0 and score <= 100));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cover_letters_word_count_check'
  ) then
    alter table public.cover_letters
      add constraint cover_letters_word_count_check
      check (word_count is null or word_count >= 0);
  end if;
end $$;

create table if not exists public.cover_letter_insights (
  id uuid primary key default gen_random_uuid(),
  cover_letter_id uuid not null references public.cover_letters(id) on delete cascade,
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.cover_letter_insights enable row level security;

grant select, insert, update, delete on table public.cover_letter_insights to service_role;
grant select, insert, update, delete on table public.cover_letter_insights to authenticated;

create index if not exists idx_applied_jobs_job_id
  on public.applied_jobs(job_id);

create index if not exists idx_applied_jobs_cover_letter_id
  on public.applied_jobs(cover_letter_id);

create index if not exists idx_job_matches_job_id
  on public.job_matches(job_id);

create index if not exists idx_cover_letters_job_id
  on public.cover_letters(job_id);

create index if not exists idx_cover_letter_insights_cover_letter_id
  on public.cover_letter_insights(cover_letter_id);
