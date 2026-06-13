create table if not exists public.course_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  display_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.course_categories (id, name, icon, display_order, is_active)
values
  ('14000000-0000-0000-0000-000000000001', 'Frontend', 'code-2', 1, true),
  ('14000000-0000-0000-0000-000000000002', 'Backend', 'server', 2, true),
  ('14000000-0000-0000-0000-000000000003', 'Database', 'database', 3, true),
  ('14000000-0000-0000-0000-000000000004', 'Data', 'bar-chart-3', 4, true)
on conflict (name) do update set
  icon = excluded.icon,
  display_order = excluded.display_order,
  is_active = excluded.is_active;

alter table public.courses
  add column if not exists description text,
  add column if not exists learning_outcomes jsonb not null default '[]'::jsonb,
  add column if not exists price numeric(10, 2),
  add column if not exists currency text,
  add column if not exists is_free boolean not null default true,
  add column if not exists rating numeric(3, 2),
  add column if not exists reviews_count integer not null default 0,
  add column if not exists enrollment_count integer not null default 0,
  add column if not exists popularity_score integer not null default 0,
  add column if not exists category_id uuid;

update public.courses c
set category_id = cc.id
from public.course_categories cc
where c.category_id is null
  and lower(c.category) = lower(cc.name);

update public.courses
set
  currency = coalesce(currency, 'USD'),
  price = coalesce(price, 0),
  is_free = coalesce(is_free, true),
  rating = coalesce(rating, 0),
  reviews_count = coalesce(reviews_count, 0),
  enrollment_count = coalesce(enrollment_count, 0),
  popularity_score = coalesce(popularity_score, 0),
  learning_outcomes = coalesce(learning_outcomes, '[]'::jsonb);

alter table public.courses
  add constraint courses_category_id_fkey
    foreign key (category_id) references public.course_categories(id) on delete set null,
  add constraint courses_price_non_negative check (price is null or price >= 0),
  add constraint courses_rating_range check (rating is null or (rating >= 0 and rating <= 5)),
  add constraint courses_reviews_count_non_negative check (reviews_count >= 0),
  add constraint courses_enrollment_count_non_negative check (enrollment_count >= 0),
  add constraint courses_popularity_score_non_negative check (popularity_score >= 0);

create table if not exists public.saved_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

drop trigger if exists set_course_enrollments_updated_at on public.course_enrollments;
create trigger set_course_enrollments_updated_at
before update on public.course_enrollments
for each row execute function public.set_updated_at();

create index if not exists idx_courses_category_id on public.courses(category_id);
create index if not exists idx_courses_rating on public.courses(rating);
create index if not exists idx_courses_popularity_score on public.courses(popularity_score);
create index if not exists idx_saved_courses_user_id on public.saved_courses(user_id);
create index if not exists idx_saved_courses_course_id on public.saved_courses(course_id);
create index if not exists idx_course_enrollments_user_id on public.course_enrollments(user_id);
create index if not exists idx_course_enrollments_course_id on public.course_enrollments(course_id);
create index if not exists idx_course_enrollments_status on public.course_enrollments(status);

alter table public.course_categories enable row level security;
alter table public.saved_courses enable row level security;
alter table public.course_enrollments enable row level security;
