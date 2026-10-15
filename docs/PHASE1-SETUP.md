# Phase 1 Setup — আপনি যা করবেন

## ১. নতুন Supabase প্রজেক্ট বানান
- supabase.com-এ লগইন করুন, **New Project** — নাম দিন `recovery-hub` (এটা
  Vangcur-এর ডাটাবেজ থেকে সম্পূর্ণ আলাদা, নতুন প্রজেক্ট)
- প্রজেক্ট তৈরি হলে **SQL Editor**-এ যান, `supabase/migrations/0001_init.sql`
  ফাইলের পুরো কনটেন্ট কপি করে পেস্ট করুন, **Run** চাপুন। এতে সব টেবিল/ফাংশন
  একবারে তৈরি হয়ে যাবে।
- **Project Settings → API**-এ যান, এই তিনটা কপি করে রাখুন:
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (এটা গোপন রাখবেন, এটা দিয়ে
    পুরো ডাটাবেজে এক্সেস পাওয়া যায়)

## ২. প্রথম ingest API key বসান

SQL Editor-এ নিচেরটা Run করুন (এটা শুধু একটা পরিচিতি-key, নিচের env secret-ই
আসল নিরাপত্তা):

```sql
insert into api_keys (name, scope, key_prefix, key_hash, is_active)
values ('main-store-ingest', 'ingest', 'rhk_38dee933d7f84c7a',
        '570d52a1e3a80aba13d45913a80ddbcf76ce0fe25de4a00c3952c2601a713429', true);
```

## ৩. Environment variables বসান

`apps/hub/.env.local.example`-এর নাম পাল্টে `.env.local` করুন (লোকালি টেস্ট
করলে), বা Cloudflare/Vercel-এ env variable হিসেবে বসান:

```
NEXT_PUBLIC_SUPABASE_URL=<ধাপ ১ থেকে>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ধাপ ১ থেকে>
SUPABASE_SERVICE_ROLE_KEY=<ধাপ ১ থেকে>
INGEST_HMAC_SECRET=<নিজে জেনারেট করুন: openssl rand -hex 32 — কখনো গিটে কমিট করবেন না>
```

(`INGEST_HMAC_SECRET` গোপন রাখুন। Vangcur মূল সাইট ও Mehediadmin-এও এই একই value
`RECOVERY_HUB_HMAC_SECRET` নামে বসবে। ⚠️ এই ফাইলে আগে একটা আসল secret কমিট হয়ে গিয়েছিল —
সেটা বাতিল (rotate) করে নতুন বসাতে হবে; সম্পূর্ণ ধাপ: docs/SECURITY-AND-SETUP.md।)

## এখানেই এখন থামা — Phase 1-এর বাকি অংশ

এই Phase-এ তৈরি হলো: ডাটাবেজ, `POST /api/ingest/draft` ও
`POST /api/ingest/order` এন্ডপয়েন্ট, আর নতুন Trust Score Engine-এর প্রথম
মডিউলগুলো (phone, amount, quantity, address, behavior, hour)। এখনো বাকি:
আসল Vangcur checkout পেজে এই endpoint-কে কল করার কোড বসানো, আর Hub-টা
Cloudflare-এ আসলেই ডিপ্লয় করা — এই দুটো একসাথেই পরের ধাপে হবে, যেহেতু একটা
ছাড়া আরেকটা পরীক্ষা করা যায় না।
