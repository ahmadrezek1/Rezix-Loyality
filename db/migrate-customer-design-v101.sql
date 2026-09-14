ALTER TABLE businesses ADD COLUMN IF NOT EXISTS customer_design jsonb NOT NULL DEFAULT '{}'::jsonb;
