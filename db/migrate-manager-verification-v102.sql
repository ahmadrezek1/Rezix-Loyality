CREATE TABLE IF NOT EXISTS manager_email_challenges (
 id text PRIMARY KEY,
 manager_id text NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
 code_hash text NOT NULL,
 expires_at timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS manager_email_challenges_manager_idx ON manager_email_challenges(manager_id);
