-- =====================================================================
-- Recovery Hub — Phase 1 migration (ingest + drafts only)
-- Run this once in the Supabase SQL Editor of the NEW, separate Supabase
-- project created for Recovery Hub — NOT the Vangcur store's database.
--
-- Access model: every table is reachable ONLY by server code using the
-- service role key. RLS is enabled on every table with NO policies
-- (deny-all for anon/authenticated) — the hard rule from doc 09.
--
-- Admin/SSO tables, messaging tables, scoring-profile config, imports and
-- settings UI tables are intentionally NOT here — they land in Phase 2/4
-- migrations once those features are actually being built.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- enums ----------
create type draft_status    as enum ('draft','contacted','recovered','lost','invalid','junk');
create type priority_bucket as enum ('high','medium','review','junk','no_contact');
create type list_kind       as enum ('phone','email','ip_hash','name_word','address_word');
create type list_type       as enum ('allow','block');

-- ---------- helpers ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- machine credentials (store only a hash of the secret) ----------
create table api_keys (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                  -- e.g. 'main-store-ingest'
  scope        text not null check (scope in ('ingest','agent')),
  key_prefix   text not null,                  -- first chars, for display only
  key_hash     text not null,                  -- sha256 of the secret
  is_active    boolean not null default true,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------- customers (aggregated by phone) ----------
create table contacts (
  phone               text primary key,        -- normalised 01XXXXXXXXX
  name                text,
  delivered_count     int not null default 0,
  returned_count      int not null default 0,
  cancelled_count     int not null default 0,
  courier_success     int,
  courier_total       int,
  courier_checked_at  timestamptz,
  do_not_contact      boolean not null default false,
  opted_out_at        timestamptz,
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------- drafts (abandoned checkouts) ----------
create table checkout_drafts (
  id              uuid primary key default gen_random_uuid(),
  session_id      text not null unique,        -- upsert key from the store
  source_site     text not null default 'main',

  customer_name   text,
  phone           text,                        -- normalised 01XXXXXXXXX or null if invalid
  phone_raw       text,
  email           text,
  address         text,
  district        text,
  upazila         text,
  notes           text,

  cart_items      jsonb not null default '[]'::jsonb,
  cart_total      numeric(12,2) not null default 0,
  currency        char(3) not null default 'BDT',

  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  landing_url     text,
  user_agent      text,
  ip_hash         text,
  hour_of_day     smallint check (hour_of_day between 0 and 23),
  behavior        jsonb,                       -- {honeypotFilled, humanInteraction}

  status          draft_status not null default 'draft',

  -- scoring (new engine-drafts package + Hub rule layer)
  trust_score      smallint check (trust_score between 0 and 100),
  trust_confidence numeric(3,2),
  trust_result     jsonb,                      -- full ScoreResult from engine-drafts
  engine_version   smallint not null default 1,
  rule_flags       text[] not null default '{}',
  scored_at        timestamptz,
  bucket           priority_bucket,
  priority         numeric(6,2),

  -- recovery
  recovered_order_id text,
  recovered_at        timestamptz,

  first_seen_at    timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  do_not_contact   boolean not null default false,
  tags             text[] not null default '{}',
  admin_note       text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger checkout_drafts_updated before update on checkout_drafts
  for each row execute function set_updated_at();
create index drafts_queue_idx    on checkout_drafts(bucket, priority desc) where status in ('draft','contacted');
create index drafts_phone_idx    on checkout_drafts(phone);
create index drafts_activity_idx on checkout_drafts(last_activity_at desc);
create index drafts_status_idx   on checkout_drafts(status);
create index drafts_name_trgm    on checkout_drafts using gin (customer_name gin_trgm_ops);

create table draft_events (
  id         bigint generated always as identity primary key,
  draft_id   uuid not null references checkout_drafts(id) on delete cascade,
  type       text not null,                    -- created|updated|scored|status|note|recovered
  payload    jsonb,
  actor      text,                             -- 'system' | admin email | 'agent'
  created_at timestamptz not null default now()
);
create index draft_events_draft_idx on draft_events(draft_id, created_at desc);

-- ---------- confirmed orders (backup) ----------
create table orders_backup (
  id                uuid primary key default gen_random_uuid(),
  external_order_id text not null unique,
  session_id        text,
  customer_name     text,
  phone             text,
  email             text,
  address           text,
  district          text,
  items             jsonb not null default '[]'::jsonb,
  subtotal          numeric(12,2),
  shipping          numeric(12,2),
  discount          numeric(12,2),
  total             numeric(12,2) not null default 0,
  payment_method    text,
  payment_status    text,
  order_status      text,
  order_created_at  timestamptz,
  raw_payload       jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger orders_backup_updated before update on orders_backup
  for each row execute function set_updated_at();
create index orders_phone_idx on orders_backup(phone);
create index orders_session_idx on orders_backup(session_id);

-- ---------- Hub rule layer config (mirrors packages/shared DEFAULT_RULE_PARAMS) ----------
create table hub_rules (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  enabled     boolean not null default true,
  params      jsonb not null default '{}'::jsonb,
  description text,
  updated_at  timestamptz not null default now()
);

create table list_entries (
  id         uuid primary key default gen_random_uuid(),
  kind       list_kind not null,
  value      text not null,
  list       list_type not null,
  reason     text,
  created_by text,
  created_at timestamptz not null default now(),
  unique (kind, value, list)
);

create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table audit_log (
  id         bigint generated always as identity primary key,
  actor      text not null,
  action     text not null,
  target     text,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on audit_log(created_at desc);

-- ---------- recovery matching ----------
-- When an order arrives, mark the newest open draft for the same phone
-- (last 7 days) as recovered. Cancelling queued outbound messages is added
-- back in here once the messaging tables exist (Phase 4).
create or replace function match_order_to_draft(p_phone text, p_order_id text, p_session text)
returns uuid
language plpgsql as $$
declare v_draft uuid;
begin
  select id into v_draft
  from checkout_drafts
  where status in ('draft','contacted')
    and ( (p_session is not null and session_id = p_session)
          or (phone = p_phone and last_activity_at > now() - interval '7 days') )
  order by (session_id = p_session) desc nulls last, last_activity_at desc
  limit 1;

  if v_draft is not null then
    update checkout_drafts
       set status = 'recovered', recovered_order_id = p_order_id, recovered_at = now()
     where id = v_draft;
  end if;
  return v_draft;
end $$;

-- ---------- contacts upsert helper ----------
-- Called from /api/ingest/order to keep delivered/returned/cancelled counts
-- current, so the draft engine's history module has real data to use.
create or replace function increment_contact_counts(
  p_phone text, p_delivered int, p_returned int, p_cancelled int
) returns void
language plpgsql as $$
begin
  insert into contacts (phone, delivered_count, returned_count, cancelled_count)
  values (p_phone, p_delivered, p_returned, p_cancelled)
  on conflict (phone) do update
    set delivered_count = contacts.delivered_count + excluded.delivered_count,
        returned_count  = contacts.returned_count  + excluded.returned_count,
        cancelled_count = contacts.cancelled_count + excluded.cancelled_count,
        updated_at      = now();
end $$;

-- ---------- stats view (powers the Overview dashboard) ----------
create or replace view v_draft_stats as
select
  count(*) filter (where created_at >= date_trunc('day', now()))                     as drafts_today,
  count(*) filter (where created_at >= now() - interval '7 days')                    as drafts_7d,
  count(*) filter (where status = 'recovered' and recovered_at >= now() - interval '30 days') as recovered_30d,
  coalesce(sum(cart_total) filter (where status = 'recovered' and recovered_at >= now() - interval '30 days'),0) as recovered_value_30d,
  coalesce(sum(cart_total) filter (where status in ('draft','contacted') and bucket in ('high','medium')),0)     as pending_value
from checkout_drafts;

-- ---------- RLS: deny-all (service role bypasses RLS entirely) ----------
alter table api_keys        enable row level security;
alter table contacts        enable row level security;
alter table checkout_drafts enable row level security;
alter table draft_events    enable row level security;
alter table orders_backup   enable row level security;
alter table hub_rules       enable row level security;
alter table list_entries    enable row level security;
alter table settings        enable row level security;
alter table audit_log       enable row level security;

-- ---------- seed (safe defaults — matches packages/shared's DEFAULT_RULE_PARAMS / DEFAULT_PRIORITY_WEIGHTS) ----------
insert into hub_rules (key, enabled, params, description) values
  ('history_repeat_returns', true, '{"minReturned":2,"maxDelivered":0}', 'Returned >=2 and delivered =0 -> junk'),
  ('courier_low_success',    true, '{"minTotal":5,"maxRatio":0.4}',      'Courier success ratio < 40% over >=5 parcels -> review'),
  ('low_confidence_review',  true, '{"minConfidence":0.4}',              'Confidence below 0.40 -> review bucket');

insert into settings (key, value) values
  ('priority.weights', '{"trust":0.55,"value":0.20,"freshness":0.15,"confidence":0.10,"bucketBase":{"high":100,"medium":0}}'),
  ('store.name',       '"Vangcur"'),
  ('locale.default',   '"bn"');
