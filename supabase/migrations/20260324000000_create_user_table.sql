-- User table: core profile for the single user (RLS-ready for future multi-user)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb default '{}'::jsonb,
  skills text[] default '{}',
  preferences jsonb default '{}'::jsonb,
  user_preferences jsonb default '{}'::jsonb,
  disclaimer_acknowledged_at timestamptz,
  migration_v1b_completed_at timestamptz,
  break_mode_until timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.users is 'User profile and preferences. One row per auth.users entry.';

-- Enable RLS
alter table public.users enable row level security;

-- RLS policies: users can only access their own row
create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own row"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own row"
  on public.users for delete
  using (auth.uid() = id);

-- Auto-create user row on sign-up via trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();
