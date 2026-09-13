-- Rezix Loyalty v0.6 Authentication migration
-- Safe to run repeatedly.

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

create table if not exists auth_mfa (
  actor_type text not null check (actor_type in ('admin','manager')),
  actor_id text not null,
  secret_enc text not null,
  enabled boolean not null default false,
  recovery_codes_hash jsonb not null default '[]'::jsonb,
  enrolled_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(actor_type, actor_id)
);

create table if not exists customer_otp_challenges (
  id text primary key,
  business_id text not null references businesses(id) on delete cascade,
  phone text not null,
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

-- Existing managers/friseure are treated as verified so the migration does not lock out current production users.
update staff_users set email_verified_at=coalesce(email_verified_at, created_at, now()) where email_verified_at is null;
