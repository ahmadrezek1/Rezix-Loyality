-- Additive v1.0 migration. Existing business/customer/visit/subscription rows are preserved.
alter table businesses add column if not exists archived_at timestamptz;
alter table admin_auth_state add column if not exists password_salt text;
alter table admin_auth_state add column if not exists password_hash text;
alter table auth_tokens drop constraint if exists auth_tokens_actor_type_check;
alter table auth_tokens add constraint auth_tokens_actor_type_check check(actor_type in ('admin','manager','friseur'));
create table if not exists customer_sessions (
 token_hash text primary key, customer_id text not null references customers(id) on delete cascade,
 business_id text not null references businesses(id) on delete cascade,
 expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists customer_sessions_customer on customer_sessions(customer_id);
create table if not exists loyalty_operations (
 business_id text not null references businesses(id), request_id text not null,
 staff_id text not null references staff_users(id), customer_code text not null,
 operation text not null check(operation in ('stamp','redeem')), response jsonb not null,
 created_at timestamptz not null default now(), primary key(business_id,request_id)
);
-- Retain historical MFA data without loading or using it in the application.
