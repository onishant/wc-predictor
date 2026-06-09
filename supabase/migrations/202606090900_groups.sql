-- Groups for team-based leaderboards

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table groups enable row level security;

-- Anyone authenticated can read groups (needed for invite code lookups)
drop policy if exists "Authenticated users can read groups" on groups;
create policy "Authenticated users can read groups"
on groups for select
using (auth.role() = 'authenticated');

-- Users can create groups
drop policy if exists "Users can create groups" on groups;
create policy "Users can create groups"
on groups for insert
with check (auth.uid() = created_by);

-- Add group_id to users_profile
alter table users_profile add column if not exists group_id uuid references groups(id) on delete set null;

create index if not exists users_profile_group_id_idx on users_profile(group_id);

-- Update the leaderboard view to include group_id
create or replace view leaderboard as
select
  up.user_id,
  coalesce(up.points, 0) as points,
  coalesce(up.xp, 0) as xp,
  coalesce(up.current_streak, 0) as current_streak,
  coalesce(up.best_streak, 0) as best_streak,
  coalesce(up.character_tier, 'Rookie') as character_tier,
  p.username,
  p.group_id,
  coalesce(ap.selected_avatar_id, 'striker') as selected_avatar_id,
  coalesce(ap.equipped_gesture, 'idle') as equipped_gesture,
  coalesce(ap.equipped_feature, 'none') as equipped_feature
from user_progress up
left join users_profile p on p.id = up.user_id
left join user_avatar_profiles ap on ap.user_id = up.user_id
order by up.points desc, up.xp desc;
