-- Remove the unique constraint on phone numbers to allow duplicate phone numbers
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS unique_phone_per_user;
