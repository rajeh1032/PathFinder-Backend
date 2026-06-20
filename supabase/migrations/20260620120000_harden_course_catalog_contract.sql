update public.course_enrollments
set
  status = case when progress = 100 then 'completed' else status end,
  progress = case when status = 'completed' then 100 else progress end,
  completed_at = case
    when progress = 100 or status = 'completed' then coalesce(completed_at, now())
    else null
  end
where
  (status = 'completed' and (progress <> 100 or completed_at is null))
  or (progress = 100 and (status <> 'completed' or completed_at is null))
  or (status <> 'completed' and progress < 100 and completed_at is not null);

alter table public.course_enrollments
  drop constraint if exists course_enrollments_completion_consistency;

alter table public.course_enrollments
  add constraint course_enrollments_completion_consistency check (
    (status = 'completed' and progress = 100 and completed_at is not null)
    or (status <> 'completed' and progress < 100 and completed_at is null)
  );

create index if not exists idx_courses_available_newest
  on public.courses(created_at desc, id)
  where is_active = true and analysis_status = 'approved';

create index if not exists idx_course_enrollments_user_status
  on public.course_enrollments(user_id, status, updated_at desc);

comment on column public.courses.enrollment_count is
  'Provider/catalog popularity metadata. Local PathFinder enrollment totals are derived from course_enrollments and must not increment this field.';
