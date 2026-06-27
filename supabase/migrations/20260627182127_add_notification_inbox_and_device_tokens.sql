create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  category text not null
    check (category in ('job', 'interview', 'insight', 'learning', 'document')),
  title text not null,
  body text,
  action_label text,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios', 'web')),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where is_read = false;

create index if not exists notifications_user_category_idx
  on public.notifications (user_id, category, created_at desc);

create index if not exists device_tokens_user_idx
  on public.device_tokens (user_id);

alter table public.notifications enable row level security;
alter table public.device_tokens enable row level security;

revoke all on table public.notifications from anon, authenticated;
revoke all on table public.device_tokens from anon, authenticated;
grant select, insert, update, delete on table public.notifications to service_role;
grant select, insert, update, delete on table public.device_tokens to service_role;

drop trigger if exists set_device_tokens_updated_at on public.device_tokens;
create trigger set_device_tokens_updated_at
before update on public.device_tokens
for each row execute function public.set_updated_at();
