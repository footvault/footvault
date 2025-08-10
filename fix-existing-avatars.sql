-- Fix existing avatars that don't have proper type set
-- This should be run once to fix any existing data

-- Update avatars where type is NULL and it's the only avatar for that user
UPDATE public.avatars 
SET 
  type = 'Main',
  default_percentage = COALESCE(default_percentage, 100.00)
WHERE 
  type IS NULL 
  AND user_id IN (
    SELECT user_id 
    FROM public.avatars 
    GROUP BY user_id 
    HAVING COUNT(*) = 1
  );

-- For users with multiple avatars where none have type set, 
-- set the first one (by created_at) as Main
WITH first_avatars AS (
  SELECT DISTINCT ON (user_id) 
    id, 
    user_id
  FROM public.avatars 
  WHERE type IS NULL
  ORDER BY user_id, created_at ASC
)
UPDATE public.avatars 
SET 
  type = 'Main',
  default_percentage = COALESCE(default_percentage, 100.00)
WHERE id IN (SELECT id FROM first_avatars);

-- Set remaining avatars without type as 'Secondary'
UPDATE public.avatars 
SET 
  type = 'Secondary',
  default_percentage = COALESCE(default_percentage, 0.00)
WHERE type IS NULL;
