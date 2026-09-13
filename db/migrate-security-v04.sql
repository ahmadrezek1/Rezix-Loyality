-- Rezix v0.4 Security + Roles + Audit
create table if not exists audit_logs (
  id text primary key,
  business_id text references businesses(id) on delete cascade,
  actor_type text not null check (actor_type in ('admin','owner','manager','staff','customer','system')),
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
