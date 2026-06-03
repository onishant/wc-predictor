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

  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

