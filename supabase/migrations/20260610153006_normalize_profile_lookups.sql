create table if not exists public.education_level (
  id uuid primary key default gen_random_uuid(),
  education_level text not null unique
);

create table if not exists public.experience_year (
  id uuid primary key default gen_random_uuid(),
  experience_level text not null unique
);

create table if not exists public.current_status (
  id uuid primary key default gen_random_uuid(),
  current_status text not null unique
);

insert into public.education_level (id, education_level)
values
  ('11000000-0000-0000-0000-000000000001', 'High school'),
  ('11000000-0000-0000-0000-000000000002', 'Associate''s'),
  ('11000000-0000-0000-0000-000000000003', 'Bachelor''s'),
  ('11000000-0000-0000-0000-000000000004', 'Master''s'),
  ('11000000-0000-0000-0000-000000000005', 'PhD'),
  ('11000000-0000-0000-0000-000000000006', 'Bootcamp/self-taught')
on conflict (education_level) do nothing;

insert into public.experience_year (id, experience_level)
values
  ('12000000-0000-0000-0000-000000000001', '0-1years'),
  ('12000000-0000-0000-0000-000000000002', '1-2years'),
  ('12000000-0000-0000-0000-000000000003', '2-4years'),
  ('12000000-0000-0000-0000-000000000004', '4-7years'),
  ('12000000-0000-0000-0000-000000000005', '+7years')
on conflict (experience_level) do nothing;

insert into public.current_status (id, current_status)
values
  ('13000000-0000-0000-0000-000000000001', 'actively looking'),
  ('13000000-0000-0000-0000-000000000002', 'open to offers'),
  ('13000000-0000-0000-0000-000000000003', 'employed'),
  ('13000000-0000-0000-0000-000000000004', 'open to shift'),
  ('13000000-0000-0000-0000-000000000005', 'student/fresh grad')
on conflict (current_status) do nothing;

alter table public.profiles
  add column if not exists education_level_id uuid,
  add column if not exists experience_year_id uuid,
  add column if not exists current_status_id uuid;

update public.profiles
set education_level_id = coalesce(
  education_level_id,
  case
    when education_level ilike 'Bachelor%' then '11000000-0000-0000-0000-000000000003'::uuid
    when education_level ilike 'ITI%' then '11000000-0000-0000-0000-000000000006'::uuid
    when education_level ilike 'Bootcamp%' then '11000000-0000-0000-0000-000000000006'::uuid
    when education_level ilike 'High school%' then '11000000-0000-0000-0000-000000000001'::uuid
    when education_level ilike 'Associate%' then '11000000-0000-0000-0000-000000000002'::uuid
    when education_level ilike 'Master%' then '11000000-0000-0000-0000-000000000004'::uuid
    when education_level ilike 'PhD%' then '11000000-0000-0000-0000-000000000005'::uuid
    else '11000000-0000-0000-0000-000000000006'::uuid
  end
),
experience_year_id = coalesce(
  experience_year_id,
  case
    when experience_level ilike 'Beginner%' then '12000000-0000-0000-0000-000000000001'::uuid
    when experience_level ilike 'Junior%' then '12000000-0000-0000-0000-000000000001'::uuid
    when experience_level ilike 'Mid%' then '12000000-0000-0000-0000-000000000003'::uuid
    when experience_level ilike 'Senior%' then '12000000-0000-0000-0000-000000000004'::uuid
    else '12000000-0000-0000-0000-000000000001'::uuid
  end
),
current_status_id = coalesce(
  current_status_id,
  case
    when current_status ilike '%Fresh%' then '13000000-0000-0000-0000-000000000005'::uuid
    when current_status ilike '%Student%' then '13000000-0000-0000-0000-000000000005'::uuid
    when current_status ilike '%Career Shifter%' then '13000000-0000-0000-0000-000000000004'::uuid
    when current_status ilike '%Shift%' then '13000000-0000-0000-0000-000000000004'::uuid
    when current_status ilike '%Employed%' then '13000000-0000-0000-0000-000000000003'::uuid
    when current_status ilike '%Offer%' then '13000000-0000-0000-0000-000000000002'::uuid
    else '13000000-0000-0000-0000-000000000001'::uuid
  end
);

alter table public.profiles
  alter column education_level_id set not null,
  alter column experience_year_id set not null,
  alter column current_status_id set not null;

alter table public.profiles
  add constraint profiles_education_level_id_fkey
    foreign key (education_level_id) references public.education_level(id) on delete restrict,
  add constraint profiles_experience_year_id_fkey
    foreign key (experience_year_id) references public.experience_year(id) on delete restrict,
  add constraint profiles_current_status_id_fkey
    foreign key (current_status_id) references public.current_status(id) on delete restrict;

alter table public.profiles
  drop column if exists education_level,
  drop column if exists experience_level,
  drop column if exists current_status;

create index if not exists idx_profiles_education_level_id on public.profiles(education_level_id);
create index if not exists idx_profiles_experience_year_id on public.profiles(experience_year_id);
create index if not exists idx_profiles_current_status_id on public.profiles(current_status_id);

alter table public.education_level enable row level security;
alter table public.experience_year enable row level security;
alter table public.current_status enable row level security;
