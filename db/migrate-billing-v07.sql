-- Rezix v0.7 Stripe Billing
alter table businesses add column if not exists billing_plan text not null default 'trial';
alter table businesses add column if not exists subscription_status text not null default 'trialing';
alter table businesses add column if not exists trial_started_at timestamptz;
alter table businesses add column if not exists trial_ends_at timestamptz;
alter table businesses add column if not exists stripe_customer_id text;
alter table businesses add column if not exists stripe_subscription_id text;
alter table businesses add column if not exists stripe_price_id text;
alter table businesses add column if not exists subscription_current_period_end timestamptz;
alter table businesses add column if not exists cancel_at_period_end boolean not null default false;
alter table businesses add column if not exists billing_grace_until timestamptz;
alter table businesses add column if not exists billing_updated_at timestamptz not null default now();

-- Existing salons receive one onboarding trial if billing was never initialized.
update businesses
set trial_started_at = coalesce(trial_started_at, now()),
    trial_ends_at = coalesce(trial_ends_at, now() + interval '3 days'),
    subscription_status = case
      when stripe_subscription_id is null and coalesce(trial_ends_at, now() + interval '3 days') > now() then 'trialing'
      when stripe_subscription_id is null then 'trial_expired'
      else subscription_status
    end,
    billing_plan = case when stripe_subscription_id is null then 'trial' else billing_plan end,
    billing_updated_at = now()
where trial_started_at is null or trial_ends_at is null;

create unique index if not exists idx_businesses_stripe_customer on businesses(stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists idx_businesses_stripe_subscription on businesses(stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists idx_businesses_subscription_status on businesses(subscription_status);

create table if not exists stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  processed boolean not null default false,
  processing_started_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);


alter table stripe_webhook_events add column if not exists processing_started_at timestamptz;
create table if not exists billing_history (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  event_type text not null,
  stripe_event_id text,
  subscription_status text,
  billing_plan text,
  amount_total bigint,
  currency text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_billing_history_business on billing_history(business_id,created_at desc);

-- Constrain known values where possible without breaking existing rows.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='businesses_billing_plan_check') then
    alter table businesses add constraint businesses_billing_plan_check check (billing_plan in ('trial','starter','professional','business'));
  end if;
  if not exists (select 1 from pg_constraint where conname='businesses_subscription_status_check') then
    alter table businesses add constraint businesses_subscription_status_check check (subscription_status in ('trialing','trial_expired','incomplete','incomplete_expired','active','past_due','canceled','unpaid','paused'));
  end if;
end $$;
