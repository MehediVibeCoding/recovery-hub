# Recovery Hub

Vangcur-এর abandoned-checkout রিকভারি সিস্টেম — নিজস্ব Trust Score Engine + SMS Agent সহ।
মূল Vangcur স্টোর থেকে সম্পূর্ণ আলাদা একটা প্রজেক্ট।

## এই Phase-এ (Phase 0) কী আছে

শুধু একটা কাঠামো (skeleton) — এখনো আসল ফিচার কিছু নেই। এর উদ্দেশ্য হলো প্রজেক্টটা
ঠিকভাবে তৈরি আছে কিনা সেটা নিশ্চিত করা, পরের Phase-গুলোর ভিত্তি হিসেবে।

```
recovery-hub/
  apps/
    hub/            ← মূল ওয়েবসাইট (Next.js) — Cloudflare-এ হোস্ট হবে
    agent/           ← SMS Agent — Cloudflare Worker, প্রতি কয়েক মিনিটে নিজে চালু হবে
  packages/
    engine-drafts/   ← নতুন Trust Score Engine (draft-দের জন্য, এখনো খালি কাঠামো)
    shared/          ← দুই জায়গাতেই ব্যবহার হবে এমন কোড (ফোন নম্বর ঠিক করা ইত্যাদি)
```

## আপনাকে এখন যা করতে হবে

1. GitHub-এ নতুন একটা **private** repo বানান, নাম দিন `recovery-hub` (বা যা ইচ্ছা)।
2. এই পুরো ZIP-এর ভেতরের সব ফাইল, ঠিক একই ফোল্ডার গঠন মেনে, সেই repo-তে আপলোড করুন।
3. আপাতত কিছু ডিপ্লয় করার দরকার নেই — এই Phase-এ শুধু কাঠামোটা GitHub-এ থাকলেই হবে।
4. আমাকে বলুন repo-টা public/private যেটাই করুন, GitHub link আমাকে দিন — পরের Phase থেকে
   আমি সরাসরি কোড পড়তে/লিখতে পারব যদি public হয়, নাহলে আপনাকে প্রতিবার আপলোড করতে হবে
   (যেভাবে Vangcur-এর repo-গুলোতে করছেন)।

এই Phase-এ কোনো `.env` ফাইল পূরণ করারও দরকার নেই — `.env.example` শুধু দেখিয়ে রাখছে
পরের Phase-গুলোতে কী কী key লাগবে।

## Phase 1 (এই ZIP-এ ইতিমধ্যে যোগ হয়েছে)

- `supabase/migrations/0001_init.sql` — ডাটাবেজের সব টেবিল/ফাংশন
- `app/api/ingest/draft` ও `app/api/ingest/order` — Vangcur checkout ও
  অর্ডার থেকে ডাটা আসার endpoint
- `packages/engine-drafts` — নতুন Trust Score Engine-এর বাস্তব মডিউল
  (phone, amount, quantity, address, behavior, hour)
- `packages/shared` — validation, HMAC auth, rule layer, priority ফর্মুলা

**সেটআপের ধাপে ধাপে নির্দেশনা: `docs/PHASE1-SETUP.md` দেখুন।**

## Done — এই Phase সফল হলো কীভাবে বুঝবেন

- `npm install && npm test` রুট থেকে এরর ছাড়া শেষ হয় (২৬টা টেস্ট pass) — আমি
  চালিয়ে যাচাই করেছি
- `npm run build` (apps/hub-এ) এরর ছাড়া শেষ হয় — এটাও যাচাই করা হয়েছে
- মাইগ্রেশন SQL-টা একটা আসল Postgres-এ চালিয়ে নিশ্চিত হয়েছি কোনো syntax error নেই
