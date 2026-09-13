-- Rezix v0.5 GDPR / Datenschutz
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
create index if not exists idx_consents_business_created on consent_records(business_id, created_at desc);

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
create index if not exists idx_privacy_requests_customer on privacy_requests(customer_id,requested_at desc);
