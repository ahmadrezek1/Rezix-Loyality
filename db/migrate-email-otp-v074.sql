
-- Rezix v0.7.4: customer authentication by e-mail OTP
alter table customers add column if not exists email text;
alter table customers alter column phone drop not null;
create unique index if not exists customers_business_email_unique on customers(business_id, lower(email)) where email is not null;

alter table customer_otp_challenges add column if not exists email text;
alter table customer_otp_challenges alter column phone drop not null;
create index if not exists customer_otp_email_idx on customer_otp_challenges(business_id, lower(email), created_at desc);
