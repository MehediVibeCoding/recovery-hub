-- =====================================================================
-- Recovery Hub — 0003: সিকিউরিটি হার্ডেনিং + স্টক-রিস্টক সিগন্যাল + লগইন সুরক্ষা
-- =====================================================================
-- হাব শুধু service_role দিয়ে ডাটাবেজে যায় (সার্ভার-সাইড)। তাই Supabase-এর ডিফল্ট
-- anon/authenticated গ্র্যান্টগুলো পুরোপুরি তুলে দেওয়া হলো — RLS-এর ওপর একটা দ্বিতীয় স্তর।

-- ১. API রোল (anon/authenticated)-এর সব টেবিল/সিকোয়েন্স অ্যাক্সেস বন্ধ
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ২. আমাদের নিজস্ব ফাংশন (এক্সটেনশনের নয়) anon/authenticated কল করতে পারবে না
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- ৩. ভিউ এখন কলকারীর অনুমতিতে চলবে (মালিকের নয়) — RLS বাইপাস বন্ধ
alter view v_draft_stats set (security_invoker = true);

-- ৪. স্টক রিকোয়েস্ট: "স্টকে ফিরেছে" সিগন্যালের কলাম
alter table stock_requests
  add column if not exists restocked_at    timestamptz,
  add column if not exists restocked_stock int;
create index if not exists stock_requests_restocked_idx on stock_requests(restocked_at desc) where restocked_at is not null;
create index if not exists stock_requests_product_idx on stock_requests(product_id);

-- অ্যাডমিন প্যানেল থেকে স্টক ০ → বেশি হলে এটা চলে: ওই প্রোডাক্টের pending রিকোয়েস্টগুলো চিহ্নিত হয়
create or replace function hub_mark_restocked(p_product_id text, p_stock int)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare v_count int;
begin
  update stock_requests
     set restocked_at = now(), restocked_stock = p_stock
   where product_id = p_product_id
     and status = 'pending';
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ৫. লগইন/SSO রেট লিমিট (Cloudflare Worker-এ মেমরি টেকে না — তাই ডাটাবেজে)
create table if not exists hub_rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);
alter table hub_rate_limits enable row level security;
revoke all on hub_rate_limits from anon, authenticated;

create or replace function hub_rate_limit(p_key text, p_max int, p_window_sec int)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare v_hits int;
begin
  insert into hub_rate_limits as t (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when t.window_start < now() - make_interval(secs => p_window_sec) then 1 else t.hits + 1 end,
        window_start = case when t.window_start < now() - make_interval(secs => p_window_sec) then now() else t.window_start end
  returning hits into v_hits;

  -- পুরনো এন্ট্রি মাঝে মাঝে সাফ
  if random() < 0.02 then
    delete from hub_rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end $$;

-- ৬. SSO টোকেন একবারের বেশি ব্যবহার ঠেকানো (replay protection)
create table if not exists sso_nonces (
  nonce      text primary key,
  created_at timestamptz not null default now()
);
alter table sso_nonces enable row level security;
revoke all on sso_nonces from anon, authenticated;

create or replace function hub_consume_nonce(p_nonce text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare v_count int;
begin
  delete from sso_nonces where created_at < now() - interval '1 day';
  insert into sso_nonces(nonce) values (p_nonce) on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count = 1;
end $$;

-- নতুন ফাংশনগুলোর জন্যও একই লক
revoke execute on function hub_mark_restocked(text, int)      from public, anon, authenticated;
revoke execute on function hub_rate_limit(text, int, int)     from public, anon, authenticated;
revoke execute on function hub_consume_nonce(text)            from public, anon, authenticated;
grant  execute on function hub_mark_restocked(text, int)      to service_role;
grant  execute on function hub_rate_limit(text, int, int)     to service_role;
grant  execute on function hub_consume_nonce(text)            to service_role;
