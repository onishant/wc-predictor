-- Fix: admins can update any user's profile (assign groups, change roles, etc.)

create policy "Admins can update any profile"
on users_profile for update
using (is_admin())
with check (is_admin());
