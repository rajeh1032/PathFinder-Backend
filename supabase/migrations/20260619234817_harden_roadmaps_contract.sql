alter table public.roadmaps
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.roadmap_step_courses (
  id uuid primary key default gen_random_uuid(),
  roadmap_step_id uuid not null references public.roadmap_steps(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  recommendation_order integer not null check (recommendation_order > 0),
  source text not null default 'ai',
  created_at timestamptz not null default now(),
  unique (roadmap_step_id, course_id),
  unique (roadmap_step_id, recommendation_order)
);

create index if not exists idx_roadmap_step_courses_course_id
  on public.roadmap_step_courses(course_id);

alter table public.roadmap_step_courses enable row level security;
grant select, insert, update, delete
  on public.roadmap_step_courses
  to service_role;

update public.roadmap_steps
set
  is_completed = (progress = 100),
  completed_at = case
    when progress = 100 then coalesce(completed_at, now())
    else null
  end
where
  is_completed is distinct from (progress = 100)
  or (progress = 100 and completed_at is null)
  or (progress < 100 and completed_at is not null);

alter table public.roadmap_steps
  drop constraint if exists roadmap_steps_completion_consistency;

alter table public.roadmap_steps
  add constraint roadmap_steps_completion_consistency check (
    is_completed = (progress = 100)
    and (
      (is_completed and completed_at is not null)
      or (not is_completed and completed_at is null)
    )
  );

create or replace function public.create_roadmap_atomic(
  p_user_id uuid,
  p_career_path_id uuid,
  p_title text,
  p_description text,
  p_metadata jsonb,
  p_generated_by_type public.generated_by_type,
  p_steps jsonb,
  p_force_regenerate boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_roadmap_id uuid;
  v_step jsonb;
  v_step_id uuid;
  v_course_id text;
  v_course_order integer;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'User id is required';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception using errcode = '22023', message = 'Roadmap title is required';
  end if;

  if p_steps is null
    or jsonb_typeof(p_steps) <> 'array'
    or jsonb_array_length(p_steps) = 0
  then
    raise exception using errcode = '22023', message = 'At least one roadmap step is required';
  end if;

  if p_force_regenerate then
    update public.roadmaps
    set status = 'paused'
    where user_id = p_user_id and status = 'active';
  end if;

  insert into public.roadmaps (
    user_id,
    career_path_id,
    title,
    description,
    metadata,
    progress,
    status,
    generated_by_type
  )
  values (
    p_user_id,
    p_career_path_id,
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    coalesce(p_metadata, '{}'::jsonb),
    0,
    'active',
    p_generated_by_type
  )
  returning id into v_roadmap_id;

  for v_step in
    select value
    from jsonb_array_elements(p_steps)
    order by (value ->> 'step_order')::integer
  loop
    if nullif(btrim(v_step ->> 'title'), '') is null then
      raise exception using errcode = '22023', message = 'Roadmap step title is required';
    end if;

    insert into public.roadmap_steps (
      roadmap_id,
      skill_id,
      title,
      description,
      step_order,
      progress,
      is_completed,
      completed_at
    )
    values (
      v_roadmap_id,
      nullif(v_step ->> 'skill_id', '')::uuid,
      btrim(v_step ->> 'title'),
      nullif(btrim(coalesce(v_step ->> 'description', '')), ''),
      (v_step ->> 'step_order')::integer,
      0,
      false,
      null
    )
    returning id into v_step_id;

    v_course_order := 0;
    for v_course_id in
      select jsonb_array_elements_text(
        coalesce(v_step -> 'recommended_course_ids', '[]'::jsonb)
      )
    loop
      v_course_order := v_course_order + 1;
      insert into public.roadmap_step_courses (
        roadmap_step_id,
        course_id,
        recommendation_order,
        source
      )
      values (v_step_id, v_course_id::uuid, v_course_order, 'ai');
    end loop;
  end loop;

  return v_roadmap_id;
end;
$$;

create or replace function public.update_roadmap_step_progress_atomic(
  p_user_id uuid,
  p_roadmap_id uuid,
  p_step_id uuid,
  p_progress integer,
  p_is_completed boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total_progress integer;
begin
  if p_progress < 0 or p_progress > 100 then
    raise exception using errcode = '22023', message = 'Progress must be between 0 and 100';
  end if;

  if p_is_completed is distinct from (p_progress = 100) then
    raise exception using
      errcode = '22023',
      message = 'isCompleted must be true only when progress is 100';
  end if;

  if not exists (
    select 1
    from public.roadmaps
    where id = p_roadmap_id and user_id = p_user_id
  ) then
    raise exception using errcode = 'P0002', message = 'Roadmap not found';
  end if;

  update public.roadmap_steps
  set
    progress = p_progress,
    is_completed = p_is_completed,
    completed_at = case when p_is_completed then now() else null end
  where id = p_step_id and roadmap_id = p_roadmap_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Roadmap step not found';
  end if;

  select coalesce(round(avg(progress)), 0)::integer
  into v_total_progress
  from public.roadmap_steps
  where roadmap_id = p_roadmap_id;

  update public.roadmaps
  set
    progress = v_total_progress,
    status = case when v_total_progress = 100 then 'completed' else 'active' end
  where id = p_roadmap_id and user_id = p_user_id;

  return p_roadmap_id;
end;
$$;

revoke all on function public.create_roadmap_atomic(
  uuid, uuid, text, text, jsonb, public.generated_by_type, jsonb, boolean
) from public, anon, authenticated;
grant execute on function public.create_roadmap_atomic(
  uuid, uuid, text, text, jsonb, public.generated_by_type, jsonb, boolean
) to service_role;

revoke all on function public.update_roadmap_step_progress_atomic(
  uuid, uuid, uuid, integer, boolean
) from public, anon, authenticated;
grant execute on function public.update_roadmap_step_progress_atomic(
  uuid, uuid, uuid, integer, boolean
) to service_role;
