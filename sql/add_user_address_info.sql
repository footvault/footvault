-- Add receipt address and more info columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS receipt_address text,
ADD COLUMN IF NOT EXISTS receipt_more_info text;

-- Add payment received and change amount columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS payment_received numeric(10, 2),
ADD COLUMN IF NOT EXISTS change_amount numeric(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS additional_charge numeric(10, 2) DEFAULT 0.00;

-- Updated users table structure with new columns
/*
create table public.users (
  id uuid not null,
  username text not null,
  plan text not null default 'Free'::text,
  next_billing_date date null,
  currency text not null default 'USD'::text,
  timezone text not null default 'America/New_York'::text,
  subscription_id text null,
  creem_customer_id text null,
  updated_at timestamp with time zone null default now(),
  email text not null default ''::text,
  receipt_address text null,
  receipt_more_info text null,
  constraint users_pkey primary key (id),
  constraint fk_users_auth_id foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;
*/
