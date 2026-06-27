-- Add extra-time and penalty scores to matches table
alter table matches
  add column if not exists home_score_et int,
  add column if not exists away_score_et int,
  add column if not exists home_score_pen int,
  add column if not exists away_score_pen int;

-- Add predicted decider to predictions table
alter table predictions
  add column if not exists predicted_decider text;
