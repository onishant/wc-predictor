-- Add supported team to avatar profiles

alter table user_avatar_profiles add column if not exists supported_team_id uuid references teams(id) on delete set null;

create index if not exists user_avatar_profiles_team_idx on user_avatar_profiles(supported_team_id);

-- Update leaderboard view to include supported team crest
drop view if exists leaderboard;

create view leaderboard as
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
  coalesce(ap.equipped_feature, 'none') as equipped_feature,
  ap.supported_team_id,
  t.crest_url as team_crest_url,
  t.name as team_name
from user_progress up
left join users_profile p on p.id = up.user_id
left join user_avatar_profiles ap on ap.user_id = up.user_id
left join teams t on t.id = ap.supported_team_id
order by up.points desc, up.xp desc;
