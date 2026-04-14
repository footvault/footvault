alter table public.users
add column if not exists subscription_status text default 'free';

alter table public.users
add column if not exists subscription_ends_at date;

update public.users
set subscription_status = case
  when coalesce(plan, 'Free') = 'Free' then 'free'
  else 'active'
end
where subscription_status is null
   or btrim(subscription_status) = '';

alter table public.users
alter column subscription_status set default 'free';

alter table public.users
alter column subscription_status set not null;

alter table public.users
drop constraint if exists users_subscription_status_check;

alter table public.users
add constraint users_subscription_status_check
check (
  subscription_status = any (
    array['free'::text, 'active'::text, 'scheduled_cancel'::text, 'past_due'::text, 'canceled'::text, 'expired'::text]
  )
);

create index if not exists idx_users_subscription_status
on public.users using btree (subscription_status);

create index if not exists idx_users_subscription_ends_at
on public.users using btree (subscription_ends_at);
