create table if not exists public.interview_question_sets (
  id uuid primary key default gen_random_uuid(),
  career_path_id uuid references public.career_paths(id) on delete set null,
  interview_type text not null,
  request_text text not null,
  embedding vector(1536) not null,
  questions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.interview_question_sets
  drop column if exists difficulty;

create index if not exists idx_interview_question_sets_interview_type
  on public.interview_question_sets(interview_type);

create index if not exists idx_interview_question_sets_career_path_id
  on public.interview_question_sets(career_path_id);

create index if not exists idx_interview_question_sets_created_at
  on public.interview_question_sets(created_at desc);

create index if not exists idx_interview_question_sets_embedding
  on public.interview_question_sets
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_interview_question_sets(
  query_embedding text,
  p_interview_type text,
  p_career_path_id uuid default null,
  match_threshold double precision default 0.9,
  match_count integer default 10
)
returns table (
  id uuid,
  career_path_id uuid,
  interview_type text,
  request_text text,
  embedding vector(1536),
  questions jsonb,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    qs.id,
    qs.career_path_id,
    qs.interview_type,
    qs.request_text,
    qs.embedding,
    qs.questions,
    qs.metadata,
    1 - (qs.embedding <=> query_embedding::vector) as similarity
  from public.interview_question_sets qs
  where qs.interview_type = p_interview_type
    and (p_career_path_id is null or qs.career_path_id = p_career_path_id)
    and 1 - (qs.embedding <=> query_embedding::vector) >= match_threshold
  order by qs.embedding <=> query_embedding::vector asc
  limit match_count;
$$;
