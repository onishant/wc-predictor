create table if not exists user_avatar_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_avatar_id text not null default 'striker',
  equipped_gesture text not null default 'idle',
  equipped_feature text not null default 'none',
  unlocked_gestures jsonb not null default '["idle"]'::jsonb,
  unlocked_features jsonb not null default '[]'::jsonb,
  xp_spent int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_user_avatar_profiles_updated_at on user_avatar_profiles;
create trigger set_user_avatar_profiles_updated_at
before update on user_avatar_profiles
for each row execute function set_updated_at();

insert into public.user_avatar_profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.handle_new_auth_user()
returns trigger
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := nullif(trim(new.raw_user_meta_data->>'username'), '');

  if base_username is null then
    base_username := nullif(split_part(new.email, '@', 1), '');
  end if;

  if base_username is null then
    base_username := 'User';
  end if;

  final_username := left(regexp_replace(base_username, '[^a-zA-Z0-9_-]', '_', 'g'), 40);

  if final_username = '' then
    final_username := 'User';
  end if;

  if exists (
    select 1
    from public.users_profile
    where username = final_username
      and id <> new.id
  ) then
    final_username := left(final_username, 31) || '-' || left(new.id::text, 8);
  end if;

  insert into public.users_profile (id, username)
  values (new.id, final_username)
  on conflict (id) do update
  set username = excluded.username;

  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_avatar_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql;

alter table user_avatar_profiles enable row level security;

drop policy if exists "Users can read avatar profiles" on user_avatar_profiles;
create policy "Users can read avatar profiles"
on user_avatar_profiles for select
using (true);

drop policy if exists "Users can insert their avatar profile" on user_avatar_profiles;
create policy "Users can insert their avatar profile"
on user_avatar_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their avatar profile" on user_avatar_profiles;
create policy "Users can update their avatar profile"
on user_avatar_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace view leaderboard as
select
  up.user_id,
  coalesce(up.points, 0) as points,
  coalesce(up.xp, 0) as xp,
  coalesce(up.current_streak, 0) as current_streak,
  coalesce(up.best_streak, 0) as best_streak,
  coalesce(up.character_tier, 'Rookie') as character_tier,
  p.username,
  coalesce(ap.selected_avatar_id, 'striker') as selected_avatar_id,
  coalesce(ap.equipped_gesture, 'idle') as equipped_gesture,
  coalesce(ap.equipped_feature, 'none') as equipped_feature
from user_progress up
left join users_profile p on p.id = up.user_id
left join user_avatar_profiles ap on ap.user_id = up.user_id
order by up.points desc, up.xp desc;
