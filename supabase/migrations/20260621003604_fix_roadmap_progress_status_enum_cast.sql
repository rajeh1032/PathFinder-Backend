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
    status = (
      case when v_total_progress = 100 then 'completed' else 'active' end
    )::public.roadmap_status
  where id = p_roadmap_id and user_id = p_user_id;

  return p_roadmap_id;
end;
$$;

revoke all on function public.update_roadmap_step_progress_atomic(
  uuid, uuid, uuid, integer, boolean
) from public, anon, authenticated;

grant execute on function public.update_roadmap_step_progress_atomic(
  uuid, uuid, uuid, integer, boolean
) to service_role;
