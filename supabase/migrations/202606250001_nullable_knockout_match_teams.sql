-- Make home_team_id and away_team_id nullable so knockout fixtures
-- can be stored before both teams are confirmed.
alter table matches
  alter column home_team_id drop not null,
  alter column away_team_id drop not null;
