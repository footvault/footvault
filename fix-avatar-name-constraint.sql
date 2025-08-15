-- Fix avatar name constraint to be per-user instead of global
-- This allows multiple users to have avatars with the same name

-- First, drop the existing global unique constraint
ALTER TABLE avatars DROP CONSTRAINT IF EXISTS avatars_name_key;

-- Add a new composite unique constraint for name + user_id
-- This ensures avatar names are unique only within each user's avatars
ALTER TABLE avatars ADD CONSTRAINT avatars_name_user_id_key UNIQUE (name, user_id);

-- Verify the constraint was added
SELECT conname, contype, conkey 
FROM pg_constraint 
WHERE conrelid = 'avatars'::regclass 
AND conname = 'avatars_name_user_id_key';
