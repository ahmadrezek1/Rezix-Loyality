CREATE TABLE IF NOT EXISTS trusted_pin_devices (
 token_hash text PRIMARY KEY,
 staff_id text NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('manager','friseur')),
 pin_salt text NOT NULL, pin_hash text NOT NULL, credential_hash text NOT NULL,
 attempts integer NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS trusted_pin_devices_staff_idx ON trusted_pin_devices(staff_id);
