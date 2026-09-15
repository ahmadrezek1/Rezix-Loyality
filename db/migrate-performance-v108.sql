create index if not exists customers_active_page_idx on customers(business_id,created_at desc,id desc) where active=true;
create index if not exists visits_business_stamp_date_idx on visits(business_id,created_at) where type='stamp';
create index if not exists customers_active_visit_idx on customers(business_id,last_visit_at) where active=true;
