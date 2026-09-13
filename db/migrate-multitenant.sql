-- Rezix 0.2 -> 0.3 Multi-Salon Migration
alter table businesses add column if not exists slug text;
alter table businesses add column if not exists logo_url text;
alter table businesses add column if not exists stamp_url text;
alter table businesses add column if not exists active boolean not null default true;
update businesses set slug=case when id='main' then 'main' else lower(regexp_replace(name,'[^a-zA-Z0-9]+','-','g')) end where slug is null;
create unique index if not exists businesses_slug_unique on businesses(slug);
alter table businesses alter column slug set not null;

alter table staff_users add column if not exists business_id text;
alter table customers add column if not exists business_id text;
alter table visits add column if not exists business_id text;
update staff_users set business_id='main' where business_id is null and exists(select 1 from businesses where id='main');
update customers set business_id='main' where business_id is null and exists(select 1 from businesses where id='main');
update visits set business_id='main' where business_id is null and exists(select 1 from businesses where id='main');

alter table staff_users drop constraint if exists staff_users_role_check;
alter table staff_users add constraint staff_users_role_check check (role in ('owner','staff','manager','friseur'));

alter table customers drop constraint if exists customers_phone_key;
create unique index if not exists customers_business_phone_unique on customers(business_id,phone);

DO $$ BEGIN
 if not exists(select 1 from pg_constraint where conname='staff_users_business_id_fkey') then alter table staff_users add constraint staff_users_business_id_fkey foreign key (business_id) references businesses(id) on delete cascade; end if;
 if not exists(select 1 from pg_constraint where conname='customers_business_id_fkey') then alter table customers add constraint customers_business_id_fkey foreign key (business_id) references businesses(id) on delete cascade; end if;
 if not exists(select 1 from pg_constraint where conname='visits_business_id_fkey') then alter table visits add constraint visits_business_id_fkey foreign key (business_id) references businesses(id) on delete cascade; end if;
END $$;

-- If rows exist, all of them should now be attached to the legacy 'main' business.
-- Empty installations are ready immediately for new salons.
DO $$ BEGIN
 if not exists(select 1 from staff_users where business_id is null) then alter table staff_users alter column business_id set not null; end if;
 if not exists(select 1 from customers where business_id is null) then alter table customers alter column business_id set not null; end if;
 if not exists(select 1 from visits where business_id is null) then alter table visits alter column business_id set not null; end if;
END $$;

create index if not exists idx_staff_business_id on staff_users(business_id);
create index if not exists idx_customers_business_id on customers(business_id);
create index if not exists idx_visits_business_id on visits(business_id);
