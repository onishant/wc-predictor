alter table predictions
  add column if not exists match_external_id text;

update predictions p
set match_external_id = m.external_match_id
from matches m
where p.match_external_id is null
  and p.match_id = m.id;

alter table predictions
  drop constraint if exists predictions_match_id_fkey;

alter table predictions
  drop constraint if exists predictions_user_id_match_id_key;

alter table predictions
  alter column match_external_id set not null;

alter table predictions
  drop column if exists match_id;

alter table predictions
  add constraint predictions_user_id_match_external_id_key unique (user_id, match_external_id);
