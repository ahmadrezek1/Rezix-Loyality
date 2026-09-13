create table if not exists businesses (
  id text primary key default 'main',
  name text not null,
  reward_target integer not null check (reward_target between 2 and 30),
  reward_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists staff_users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_salt text not null,
  password_hash text not null,
  role text not null check (role in ('staff','manager')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id text primary key,
  code text not null unique,
  token text not null unique,
  name text not null,
  phone text not null unique,
  stamps integer not null default 0 check (stamps >= 0),
  rewards_redeemed integer not null default 0 check (rewards_redeemed >= 0),
  created_at timestamptz not null default now(),
  last_visit_at timestamptz
);

create table if not exists visits (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  staff_id text not null references staff_users(id) on delete restrict,
  type text not null check (type in ('stamp','redeem')),
  created_at timestamptz not null default now()
);

create index if not exists idx_visits_created_at on visits(created_at desc);
create index if not exists idx_visits_customer_id on visits(customer_id);
create index if not exists idx_customers_created_at on customers(created_at desc);
