-- Add constraint to ensure only one Main avatar per user
-- This prevents duplicate Main avatars from being created

-- First, clean up any duplicate Main avatars (keep the first one)
WITH ranked_mains AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
  FROM public.avatars 
  WHERE type = 'Main'
)
UPDATE public.avatars 
SET type = 'Secondary'
WHERE id IN (
  SELECT id FROM ranked_mains WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE public.avatars 
ADD CONSTRAINT avatars_one_main_per_user 
UNIQUE (user_id, type) 
DEFERRABLE INITIALLY DEFERRED
WHERE (type = 'Main');

-- Alternative approach using partial unique index (more flexible)
-- DROP CONSTRAINT IF EXISTS avatars_one_main_per_user;
-- CREATE UNIQUE INDEX avatars_one_main_per_user_idx 
-- ON public.avatars (user_id) 
-- WHERE type = 'Main';
