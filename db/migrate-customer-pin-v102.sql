alter table customers add column if not exists pin_salt text;
alter table customers add column if not exists pin_hash text;
alter table customers add column if not exists pin_set_at timestamptz;
create index if not exists idx_customers_business_email_lower on customers(business_id, lower(email));
