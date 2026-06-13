alter table public.interview_sessions
  add column if not exists interview_type text,
  add column if not exists total_questions integer,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists quick_ai_insight text;

alter table public.interview_sessions
  alter column feedback_text type jsonb
  using case
    when feedback_text is null then null
    when left(btrim(feedback_text), 1) in ('{', '[') then feedback_text::jsonb
    else jsonb_build_object('summary', feedback_text)
  end;

update public.interview_sessions
set
  interview_type = coalesce(interview_type, 'technical'),
  total_questions = coalesce(total_questions, 0),
  started_at = coalesce(started_at, created_at),
  completed_at = case
    when status = 'completed' then coalesce(completed_at, updated_at)
    else completed_at
  end,
  quick_ai_insight = coalesce(
    quick_ai_insight,
    case when status = 'completed' then 'Good interview foundation' else null end
  ),
  feedback_text = coalesce(feedback_text, '{}'::jsonb);

alter table public.interview_sessions
  alter column interview_type set default 'technical',
  alter column total_questions set default 0,
  alter column feedback_text set default '{}'::jsonb;

alter table public.interview_questions
  add column if not exists question_order integer,
  add column if not exists is_skipped boolean not null default false,
  add column if not exists answer_type text,
  add column if not exists answered_at timestamptz,
  add column if not exists question_status text,
  add column if not exists ai_suggestion text;

with numbered_questions as (
  select
    id,
    row_number() over (partition by interview_session_id order by id) as generated_order
  from public.interview_questions
)
update public.interview_questions q
set question_order = n.generated_order
from numbered_questions n
where q.id = n.id
  and q.question_order is null;

update public.interview_questions
set
  is_skipped = coalesce(is_skipped, false),
  answer_type = coalesce(answer_type, case when user_answer is null then null else 'text' end),
  answered_at = coalesce(answered_at, case when user_answer is not null then now() else null end),
  question_status = coalesce(
    question_status,
    case
      when is_skipped is true then 'skipped'
      when score is null then null
      when score >= 70 then 'passed'
      else 'needs_improvement'
    end
  );

alter table public.interview_questions
  alter column question_order set not null,
  alter column is_skipped set default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'interview_sessions_interview_type_check'
  ) then
    alter table public.interview_sessions
      add constraint interview_sessions_interview_type_check
      check (interview_type in ('behavioral', 'technical', 'mock_hr'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'interview_sessions_total_questions_check'
  ) then
    alter table public.interview_sessions
      add constraint interview_sessions_total_questions_check
      check (total_questions >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'interview_sessions_completed_after_started_check'
  ) then
    alter table public.interview_sessions
      add constraint interview_sessions_completed_after_started_check
      check (completed_at is null or started_at is null or completed_at >= started_at);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'interview_questions_answer_type_check'
  ) then
    alter table public.interview_questions
      add constraint interview_questions_answer_type_check
      check (answer_type is null or answer_type in ('text', 'voice'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'interview_questions_question_status_check'
  ) then
    alter table public.interview_questions
      add constraint interview_questions_question_status_check
      check (question_status is null or question_status in ('passed', 'needs_improvement', 'skipped'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'interview_questions_session_order_unique'
  ) then
    alter table public.interview_questions
      add constraint interview_questions_session_order_unique
      unique (interview_session_id, question_order);
  end if;
end $$;

create index if not exists idx_interview_sessions_interview_type
  on public.interview_sessions(interview_type);

create index if not exists idx_interview_sessions_started_at
  on public.interview_sessions(started_at);

create index if not exists idx_interview_questions_session_order
  on public.interview_questions(interview_session_id, question_order);

create index if not exists idx_interview_questions_question_status
  on public.interview_questions(question_status);
