-- Alternative: Create a Database Function to handle new user creation
-- This approach uses Supabase's built-in auth.users triggers
-- Run this AFTER the main database-setup.sql

-- Create a function that automatically creates a profile and Main avatar when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, username, email, plan, currency, timezone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'Anonymous User'),
    COALESCE(new.email, ''),
    'Free',
    'USD',
    'America/New_York'
  );
  
  -- Create "Main" avatar with type "Main"
  INSERT INTO public.avatars (name, user_id, default_percentage, image, type)
  VALUES (
    'Main',
    new.id,
    100.00,
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/7.x/initials/svg?seed=' || COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'Main')
    ),
    'Main'
  );
  
  RETURN new;
END;
$$ language plpgsql security definer;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
