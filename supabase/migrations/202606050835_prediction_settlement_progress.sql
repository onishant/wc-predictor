alter table predictions
  add column if not exists points_awarded int not null default 0,
  add column if not exists settled_at timestamptz;

create index if not exists predictions_settlement_idx
  on predictions (settled_at, match_external_id);
