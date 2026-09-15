-- Rezix v1.0.8: hot-path indexes for dashboard, auth and loyalty traffic.
create index if not exists idx_customers_business_active_created on customers (business_id, active, created_at desc, id desc);
create index if not exists idx_customers_business_code_active on customers (business_id, code) where active=true;
create index if not exists idx_customers_business_email on customers (business_id, lower(email)) where email is not null;
create index if not exists idx_customers_business_last_visit on customers (business_id, last_visit_at desc) where active=true;
create index if not exists idx_staff_business_role_active_created on staff_users (business_id, role, active, created_at desc);
create index if not exists idx_visits_business_created on visits (business_id, created_at desc);
create index if not exists idx_visits_business_type_created on visits (business_id, type, created_at desc);
create index if not exists idx_auth_sessions_jti_active on auth_sessions (jti, expires_at) where revoked_at is null;
create index if not exists idx_auth_sessions_actor_active on auth_sessions (actor_type, actor_id, expires_at desc) where revoked_at is null;
create index if not exists idx_loyalty_operations_business_request on loyalty_operations (business_id, request_id);
