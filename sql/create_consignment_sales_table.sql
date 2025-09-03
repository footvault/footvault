-- Create consignment_sales table
create table public.consignment_sales (
  id serial not null,
  sale_id uuid null,
  variant_id uuid null,
  consignor_id integer null,
  sale_price numeric(10, 2) not null,
  commission_rate numeric(5, 2) not null,
  store_commission numeric(10, 2) not null,
  consignor_payout numeric(10, 2) not null,
  payout_status character varying(50) null default 'pending'::character varying,
  payout_date date null,
  payout_method character varying(100) null,
  notes text null,
  user_id uuid null,
  created_at timestamp with time zone null default now(),
  constraint consignment_sales_pkey primary key (id),
  constraint consignment_sales_consignor_id_fkey foreign KEY (consignor_id) references consignors (id) on delete CASCADE,
  constraint consignment_sales_sale_id_fkey foreign KEY (sale_id) references sales (id) on delete CASCADE,
  constraint consignment_sales_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint consignment_sales_variant_id_fkey foreign KEY (variant_id) references variants (id) on delete CASCADE,
  constraint valid_payout_status check (
    (
      (payout_status)::text = any (
        (
          array[
            'pending'::character varying,
            'paid'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes
create index IF not exists idx_consignment_sales_consignor_id on public.consignment_sales using btree (consignor_id) TABLESPACE pg_default;
create index IF not exists idx_consignment_sales_payout_status on public.consignment_sales using btree (payout_status) TABLESPACE pg_default;
create index IF not exists idx_consignment_sales_user_id on public.consignment_sales using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_consignment_sales_sale_id on public.consignment_sales using btree (sale_id) TABLESPACE pg_default;
create index IF not exists idx_consignment_sales_created_at on public.consignment_sales using btree (created_at) TABLESPACE pg_default;
