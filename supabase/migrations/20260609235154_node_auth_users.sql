create extension if not exists pgcrypto;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
  loop
    execute format(
      'alter table public.users drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

alter table public.users
  alter column id set default gen_random_uuid();

alter table public.users
  add column if not exists password_hash text;

update public.users
set password_hash = extensions.crypt('Pathfinder123!', extensions.gen_salt('bf'))
where password_hash is null;

alter table public.users
  alter column password_hash set not null;

comment on column public.users.password_hash is
  'Hashed password for Node.js/Express authentication. Never return this column in API responses.';
