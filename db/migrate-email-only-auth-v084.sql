-- Rezix v0.8.4: E-Mail-only privileged authentication, no MFA
create table if not exists admin_auth_state (
  email text primary key,
  email_verified_at timestamptz,
  verify_token_hash text,
  verify_token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
