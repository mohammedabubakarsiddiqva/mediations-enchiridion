-- Stoic Reader: database schema for Supabase (run once in the SQL Editor)
-- One row per user, per book (med = Meditations, enc = Enchiridion), per kind of data.

create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  lib        text        not null check (lib in ('med', 'enc')),
  kind       text        not null check (kind in ('ta', 'notes', 'fav', 'hl', 'read', 'ndate')),
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, lib, kind)
);

-- Keep updated_at honest, set by the database rather than the browser
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists user_data_updated_at on public.user_data;
create trigger user_data_updated_at
  before insert or update on public.user_data
  for each row execute function public.set_updated_at();

-- Row level security: every signed-in user can only see and change their own rows.
alter table public.user_data enable row level security;

drop policy if exists "read own data"   on public.user_data;
drop policy if exists "insert own data" on public.user_data;
drop policy if exists "update own data" on public.user_data;
drop policy if exists "delete own data" on public.user_data;

create policy "read own data"   on public.user_data for select using (auth.uid() = user_id);
create policy "insert own data" on public.user_data for insert with check (auth.uid() = user_id);
create policy "update own data" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own data" on public.user_data for delete using (auth.uid() = user_id);

-- Keep value sizes sane (about 2 MB per row is far more than this app needs)
alter table public.user_data drop constraint if exists user_data_value_size;
alter table public.user_data add constraint user_data_value_size check (pg_column_size(value) < 2000000);
