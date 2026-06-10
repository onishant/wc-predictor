-- Fix circular RLS dependency on users_profile

-- Create a security definer function to check admin role
-- This bypasses RLS since it runs as the function owner (postgres)
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users_profile
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- Drop the broken policy
drop policy if exists "Admins can read all profiles" on users_profile;

-- Recreate using the function (no circular dependency)
create policy "Admins can read all profiles"
on users_profile for select
using (is_admin());

-- Fix group_signup_tokens policies to use is_admin() (same circular dependency)
drop policy if exists "Admins can read signup tokens" on group_signup_tokens;
create policy "Admins can read signup tokens"
on group_signup_tokens for select
using (is_admin());

drop policy if exists "Admins can insert signup tokens" on group_signup_tokens;
create policy "Admins can insert signup tokens"
on group_signup_tokens for insert
with check (is_admin());

drop policy if exists "Admins can delete signup tokens" on group_signup_tokens;
create policy "Admins can delete signup tokens"
on group_signup_tokens for delete
using (is_admin());
