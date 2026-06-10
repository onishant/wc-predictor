-- News articles filtered by teams playing in the next 48 hours

create table if not exists news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text unique not null,
  source text not null,
  image_url text,
  summary text,
  published_at timestamptz,
  matched_teams text[] not null default '{}',
  fetched_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index if not exists news_published_idx on news (published_at desc);
create index if not exists news_fetched_idx on news (fetched_at desc);

-- Allow anon reads
grant select on news to anon;
grant select on news to authenticated;
grant insert, delete on news to service_role;
