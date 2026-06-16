alter table public.courses
  add column if not exists external_id text,
  add column if not exists analysis_status text,
  add column if not exists language text,
  add column if not exists analysis_confidence numeric(4, 3);

update public.courses
set analysis_status = 'approved'
where analysis_status is null;

alter table public.courses
  alter column analysis_status set default 'pending_review';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_analysis_status_check'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_analysis_status_check
      check (
        analysis_status is null
        or analysis_status in (
          'needs_manual_metadata',
          'pending_review',
          'approved',
          'rejected'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_analysis_confidence_range'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_analysis_confidence_range
      check (
        analysis_confidence is null
        or (analysis_confidence >= 0 and analysis_confidence <= 1)
      );
  end if;
end $$;

create unique index if not exists idx_courses_provider_external_id_unique
  on public.courses(provider, external_id)
  where external_id is not null;

create index if not exists idx_courses_analysis_status
  on public.courses(analysis_status);

create index if not exists idx_courses_external_id
  on public.courses(external_id)
  where external_id is not null;

alter table public.course_skills
  add column if not exists confidence numeric(4, 3),
  add column if not exists source text;

update public.course_skills
set
  confidence = coalesce(confidence, 1),
  source = coalesce(source, 'admin_manual')
where confidence is null
   or source is null;

alter table public.course_skills
  alter column source set default 'ai_analysis';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_skills_source_check'
      and conrelid = 'public.course_skills'::regclass
  ) then
    alter table public.course_skills
      add constraint course_skills_source_check
      check (source in ('ai_analysis', 'admin_manual', 'imported_metadata'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_skills_confidence_range'
      and conrelid = 'public.course_skills'::regclass
  ) then
    alter table public.course_skills
      add constraint course_skills_confidence_range
      check (confidence is null or (confidence >= 0 and confidence <= 1));
  end if;
end $$;

create index if not exists idx_course_skills_skill_confidence_source
  on public.course_skills(skill_id, confidence, source);
