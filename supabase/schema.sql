-- Core schema for FIFA Predictor MVP

create extension if not exists "pgcrypto";

create table if not exists users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  group_name text,
  crest_url text,
  created_at timestamptz default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  external_match_id text unique,
  stage text,
  home_team_id uuid references teams(id),
  away_team_id uuid references teams(id),
  kickoff_utc timestamptz not null,
  status text not null default 'scheduled',
  home_score int,
  away_score int,
  settled_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  predicted_result text not null check (predicted_result in ('home','away','draw')),
  pred_home_score int not null check (pred_home_score >= 0),
  pred_away_score int not null check (pred_away_score >= 0),
  is_locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, match_id)
);

create table if not exists user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points int default 0,
  xp int default 0,
  current_streak int default 0,
  best_streak int default 0,
  character_tier text default 'Rookie',
  updated_at timestamptz default now()
);

-- Simple updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_matches_updated_at on matches;
create trigger set_matches_updated_at
before update on matches
for each row execute function set_updated_at();

drop trigger if exists set_predictions_updated_at on predictions;
create trigger set_predictions_updated_at
before update on predictions
for each row execute function set_updated_at();

-- Helpful view for leaderboard
create or replace view leaderboard as
select
  up.user_id,
  coalesce(up.points, 0) as points,
  coalesce(up.xp, 0) as xp,
  coalesce(up.current_streak, 0) as current_streak,
  coalesce(up.best_streak, 0) as best_streak,
  coalesce(up.character_tier, 'Rookie') as character_tier,
  p.username
from user_progress up
left join users_profile p on p.id = up.user_id
order by up.points desc, up.xp desc;
