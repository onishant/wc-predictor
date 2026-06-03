alter table teams
  add column if not exists logo_url text;

alter table teams
  add column if not exists flag_url text;

update teams
set logo_url = crest_url
where logo_url is null
  and crest_url is not null;
