-- Update leaderboard view: remove xp/tier, add accuracy %

drop view if exists leaderboard;

create view leaderboard as
select
  up.user_id,
  coalesce(up.points, 0) as points,
  coalesce(up.current_streak, 0) as current_streak,
  coalesce(up.best_streak, 0) as best_streak,
  p.username,
  p.group_id,
  coalesce(ap.selected_avatar_id, 'striker') as selected_avatar_id,
  coalesce(ap.equipped_feature, 'none') as equipped_feature,
  ap.supported_team_id,
  t.crest_url as team_crest_url,
  t.name as team_name,
  -- Accuracy: correct predictions / settled predictions
  coalesce((
    select count(*) from predictions
    where predictions.user_id = up.user_id
    and settled_at is not null
  ), 0) as settled_count,
  coalesce((
    select count(*) from predictions
    where predictions.user_id = up.user_id
    and settled_at is not null
    and points_awarded >= 10
  ), 0) as correct_count
from user_progress up
left join users_profile p on p.id = up.user_id
left join user_avatar_profiles ap on ap.user_id = up.user_id
left join teams t on t.id = ap.supported_team_id
order by up.points desc;
