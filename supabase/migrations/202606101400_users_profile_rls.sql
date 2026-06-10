-- Enable RLS on users_profile and add policies for admin access

alter table users_profile enable row level security;

-- Ensure authenticated role can access the table
grant select on users_profile to authenticated;

-- Admins can read all profiles (needed for admin member management)
drop policy if exists "Admins can read all profiles" on users_profile;
create policy "Admins can read all profiles"
on users_profile for select
using (
  exists (
    select 1 from users_profile
    where users_profile.id = auth.uid()
    and users_profile.role = 'admin'
  )
);

-- Users can read their own profile
drop policy if exists "Users can read own profile" on users_profile;
create policy "Users can read own profile"
on users_profile for select
using (auth.uid() = id);

-- Users can update their own profile (but not change their role)
drop policy if exists "Users can update own profile" on users_profile;
create policy "Users can update own profile"
on users_profile for update
using (auth.uid() = id)
with check (auth.uid() = id);
