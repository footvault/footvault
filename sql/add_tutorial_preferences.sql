-- Add tutorial preferences to existing users table
-- This script adds columns to support tutorial functionality

-- Add tutorial preference columns to the existing users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tutorial_preferences JSONB DEFAULT '{
    "show_tutorials": true,
    "completed_tutorials": [],
    "dont_show_again": []
}'::jsonb;

-- Create index for better query performance on tutorial preferences
CREATE INDEX IF NOT EXISTS idx_users_tutorial_preferences ON public.users USING GIN (tutorial_preferences);

-- Create index for welcome tutorial tracking
CREATE INDEX IF NOT EXISTS idx_users_has_seen_welcome ON public.users USING btree (has_seen_welcome);

-- Create a function to initialize tutorial preferences for existing users
CREATE OR REPLACE FUNCTION public.initialize_tutorial_preferences()
RETURNS void AS $$
BEGIN
    -- Update existing users who don't have tutorial preferences set
    UPDATE public.users 
    SET 
        has_seen_welcome = TRUE, -- Existing users have already used the app
        tutorial_preferences = '{
            "show_tutorials": true,
            "completed_tutorials": [],
            "dont_show_again": []
        }'::jsonb
    WHERE tutorial_preferences IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to initialize preferences for existing users
SELECT public.initialize_tutorial_preferences();

-- Create a function to set default tutorial preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_tutorial_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default tutorial preferences for new users
    NEW.has_seen_welcome = FALSE;
    NEW.tutorial_preferences = '{
        "show_tutorials": true,
        "completed_tutorials": [],
        "dont_show_again": []
    }'::jsonb;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to set tutorial defaults for new users
DROP TRIGGER IF EXISTS on_user_insert_tutorial_setup ON public.users;
CREATE TRIGGER on_user_insert_tutorial_setup
    BEFORE INSERT ON public.users
    FOR EACH ROW 
    WHEN (NEW.has_seen_welcome IS NULL OR NEW.tutorial_preferences IS NULL)
    EXECUTE FUNCTION public.handle_new_user_tutorial_setup();