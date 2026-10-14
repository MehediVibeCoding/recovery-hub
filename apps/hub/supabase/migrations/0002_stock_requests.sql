-- =====================================================================
-- Recovery Hub — stock_requests (restock-notification requests, replaces
-- the old Google Sheets "addStockRequest" flow from the Vangcur store)
-- =====================================================================

create table stock_requests (
  id            uuid primary key default gen_random_uuid(),
  product_id    text not null,
  product_name  text,
  customer_name text,
  phone         text not null,
  status        text not null default 'pending' check (status in ('pending','notified','cancelled')),
  notified_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger stock_requests_updated before update on stock_requests
  for each row execute function set_updated_at();

-- একই প্রোডাক্টে একই ফোন নম্বর বারবার রিকোয়েস্ট করলে নতুন row তৈরি না করে
-- বিদ্যমান request-টাই রিফ্রেশ হবে (upsert-friendly)
create unique index stock_requests_product_phone_idx on stock_requests(product_id, phone);
create index stock_requests_status_idx on stock_requests(status, created_at desc);

alter table stock_requests enable row level security;
