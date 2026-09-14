create table if not exists businesses (
  id text primary key,
  slug text not null unique,
  name text not null,
  industry text not null default 'other',
  loyalty_program_type text not null default 'stamps',
  location_name text,
  street text,
  postal_code text,
  city text,
  country text not null default 'AT',
  website text,
  onboarding_completed boolean not null default false,
  counter_mode text not null default 'qr',
  reward_target integer not null check (reward_target between 2 and 30),
  reward_text text not null,
  card_title text not null default 'Deine Treuekarte',
  card_subtitle text not null default 'Deine digitale Treuekarte',
  primary_color text not null default '#2563EB',
  stamp_shape text not null default 'circle',
  logo_url text,
  stamp_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists staff_users (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  email text not null unique,
  password_salt text not null,
  password_hash text not null,
  role text not null check (role in ('manager','friseur')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  code text not null unique,
  token text not null unique,
  name text not null,
  email text,
  phone text,
  stamps integer not null default 0 check (stamps >= 0),
  rewards_redeemed integer not null default 0 check (rewards_redeemed >= 0),
  created_at timestamptz not null default now(),
  last_visit_at timestamptz,
  unique (business_id, phone)
);

create table if not exists visits (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  customer_id text not null references customers(id) on delete cascade,
  staff_id text not null references staff_users(id) on delete restrict,
  type text not null check (type in ('stamp','redeem')),
  created_at timestamptz not null default now()
);

create index if not exists idx_businesses_created_at on businesses(created_at desc);
create index if not exists idx_staff_business_id on staff_users(business_id);
create index if not exists idx_customers_business_id on customers(business_id);
create index if not exists idx_visits_business_id on visits(business_id);
create index if not exists idx_visits_created_at on visits(created_at desc);
create index if not exists idx_visits_customer_id on visits(customer_id);

-- v0.4 Security + Audit
create table if not exists audit_logs (
  id text primary key,
  business_id text references businesses(id) on delete cascade,
  actor_type text not null check (actor_type in ('admin','manager','friseur','kunde','system')),
  actor_id text,
  action text not null,
  target_type text,
  target_id text,
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_business_created on audit_logs(business_id, created_at desc);
create index if not exists idx_audit_action_created on audit_logs(action, created_at desc);

create table if not exists auth_rate_limits (
  key_hash text primary key,
  scope text not null,
  failures integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_rate_limits_updated on auth_rate_limits(updated_at);

-- v0.5 GDPR / Datenschutz
alter table customers add column if not exists active boolean not null default true;
alter table customers add column if not exists privacy_notice_ack_at timestamptz;
alter table customers add column if not exists marketing_consent boolean not null default false;
alter table customers add column if not exists marketing_consent_at timestamptz;
alter table customers add column if not exists anonymized_at timestamptz;

create table if not exists consent_records (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  customer_id text not null references customers(id) on delete cascade,
  consent_type text not null check (consent_type in ('privacy_notice','marketing')),
  granted boolean not null,
  policy_version text not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_consents_customer_created on consent_records(customer_id, created_at desc);

create table if not exists privacy_requests (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  customer_id text not null references customers(id) on delete cascade,
  request_type text not null check (request_type in ('access','erasure')),
  status text not null default 'pending' check (status in ('pending','completed','rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text references staff_users(id) on delete set null,
  resolution_note text
);
create index if not exists idx_privacy_requests_business_status on privacy_requests(business_id,status,requested_at desc);

-- v0.6 Authentication
alter table staff_users add column if not exists email_verified_at timestamptz;
alter table staff_users add column if not exists password_changed_at timestamptz default now();

create table if not exists auth_sessions (
  jti text primary key,
  actor_type text not null check (actor_type in ('admin','manager','friseur')),
  actor_id text not null,
  business_id text references businesses(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ip_hash text,
  user_agent text
);
create index if not exists auth_sessions_actor_idx on auth_sessions(actor_type, actor_id, expires_at desc);
create index if not exists auth_sessions_business_idx on auth_sessions(business_id, expires_at desc);

create table if not exists auth_tokens (
  id text primary key,
  purpose text not null check (purpose in ('email_verify','password_reset')),
  actor_id text not null,
  actor_type text not null check (actor_type in ('manager','friseur')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists auth_tokens_lookup_idx on auth_tokens(token_hash, purpose, expires_at);



create table if not exists customer_otp_challenges (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  email text,
  phone text,
  otp_hash text not null,
  pending_name text,
  privacy_ack boolean not null default false,
  marketing_consent boolean not null default false,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists customer_otp_phone_idx on customer_otp_challenges(business_id, phone, created_at desc);
create index if not exists customer_otp_email_idx on customer_otp_challenges(business_id, lower(email), created_at desc);

-- v0.7 Stripe Billing
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
create unique index if not exists idx_businesses_stripe_customer on businesses(stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists idx_businesses_stripe_subscription on businesses(stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists idx_businesses_subscription_status on businesses(subscription_status);
create table if not exists stripe_webhook_events (event_id text primary key,event_type text not null,livemode boolean not null default false,processed boolean not null default false,processing_started_at timestamptz,attempts integer not null default 0,last_error text,received_at timestamptz not null default now(),processed_at timestamptz);
create table if not exists billing_history (id text primary key,business_id text not null references businesses(id) on delete cascade,event_type text not null,stripe_event_id text,subscription_status text,billing_plan text,amount_total bigint,currency text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create index if not exists idx_billing_history_business on billing_history(business_id,created_at desc);
