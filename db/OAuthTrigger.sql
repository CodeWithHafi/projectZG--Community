CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_username text;
BEGIN
  IF new.raw_user_meta_data->>'username' IS NOT NULL THEN
    default_username := new.raw_user_meta_data->>'username';
  ELSE
    default_username := NULL; 
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
      new.id,
      default_username,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
  EXCEPTION 
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Username % already exists', default_username;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
  END;
  
  RETURN new;
END;
$$;
