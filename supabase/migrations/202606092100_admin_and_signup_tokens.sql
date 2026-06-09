-- Admin roles and group signup tokens

-- Add role column to users_profile
alter table users_profile add column if not exists role text not null default 'user';

-- Create index for role lookups
create index if not exists users_profile_role_idx on users_profile(role);

-- Group signup tokens
create table if not exists group_signup_tokens (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  token text unique not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  uses_remaining int not null default -1,
  created_at timestamptz default now()
);

alter table group_signup_tokens enable row level security;

-- Only admins can read/manage signup tokens
drop policy if exists "Admins can read signup tokens" on group_signup_tokens;
create policy "Admins can read signup tokens"
on group_signup_tokens for select
using (
  exists (
    select 1 from users_profile
    where users_profile.id = auth.uid()
    and users_profile.role = 'admin'
  )
);

drop policy if exists "Admins can insert signup tokens" on group_signup_tokens;
create policy "Admins can insert signup tokens"
on group_signup_tokens for insert
with check (
  exists (
    select 1 from users_profile
    where users_profile.id = auth.uid()
    and users_profile.role = 'admin'
  )
);

drop policy if exists "Admins can delete signup tokens" on group_signup_tokens;
create policy "Admins can delete signup tokens"
on group_signup_tokens for delete
using (
  exists (
    select 1 from users_profile
    where users_profile.id = auth.uid()
    and users_profile.role = 'admin'
  )
);

-- Allow anyone to read signup tokens (needed for signup flow validation)
drop policy if exists "Anyone can read signup tokens for validation" on group_signup_tokens;
create policy "Anyone can read signup tokens for validation"
on group_signup_tokens for select
using (true);

-- Allow authenticated users to read groups
drop policy if exists "Authenticated users can read groups" on groups;
create policy "Authenticated users can read groups"
on groups for select
using (true);
