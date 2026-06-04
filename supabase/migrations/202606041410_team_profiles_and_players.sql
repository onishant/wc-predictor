alter table teams
  add column if not exists external_team_id text,
  add column if not exists coach_name text,
  add column if not exists founded int,
  add column if not exists website text,
  add column if not exists club_colors text,
  add column if not exists venue text;

create unique index if not exists teams_external_team_id_idx
  on teams(external_team_id)
  where external_team_id is not null;

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  external_player_id text unique not null,
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  position text,
  date_of_birth date,
  nationality text,
  shirt_number int,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists players_team_id_idx on players(team_id);
