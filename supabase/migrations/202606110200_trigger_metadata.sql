-- Updated trigger: reads group_id and supported_team_id from auth metadata
-- This ensures group/team are assigned even when email confirmation is enabled

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  meta_group_id TEXT;
  meta_team_id TEXT;
BEGIN
  base_username := NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), '');

  IF base_username IS NULL THEN
    base_username := NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), '');
  END IF;

  IF base_username IS NULL THEN
    base_username := NULLIF(SPLIT_PART(NEW.email, '@', 1), '');
  END IF;

  IF base_username IS NULL THEN
    base_username := 'User';
  END IF;

  final_username := LEFT(REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_-]', '_', 'g'), 40);

  IF final_username = '' THEN
    final_username := 'User';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users_profile WHERE username = final_username AND id <> NEW.id) THEN
    final_username := LEFT(final_username, 31) || '-' || LEFT(NEW.id::text, 8);
  END IF;

  -- Create users_profile (with group_id if provided in metadata)
  meta_group_id := NEW.raw_user_meta_data->>'group_id';

  INSERT INTO public.users_profile (id, username, group_id)
  VALUES (
    NEW.id,
    final_username,
    CASE WHEN meta_group_id IS NOT NULL AND meta_group_id <> '' THEN meta_group_id::uuid ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET username = excluded.username;

  -- Create user_progress
  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create user_avatar_profiles (with supported_team_id if provided in metadata)
  meta_team_id := NEW.raw_user_meta_data->>'supported_team_id';

  INSERT INTO public.user_avatar_profiles (user_id, supported_team_id)
  VALUES (
    NEW.id,
    CASE WHEN meta_team_id IS NOT NULL AND meta_team_id <> '' THEN meta_team_id::uuid ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
