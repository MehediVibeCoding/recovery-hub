# Phase 2 — অ্যাডমিন পেজ

## ডিপ্লয়ের আগে (জরুরি)
Cloudflare → Worker `recovery-hub` → Settings → Variables and Secrets-এ বসান:

- `HUB_ADMIN_PASSWORD` (Secret) — **বাধ্যতামূলক**। না থাকলে সাইট 503 দেখাবে (ইচ্ছাকৃত: গ্রাহকের ডাটা খোলা থাকবে না)।
- `HUB_ADMIN_USER` (ঐচ্ছিক, ডিফল্ট `admin`)

`/api/ingest/*` এই গেটের বাইরে (HMAC দিয়েই সুরক্ষিত)।

## পেজ
`/` Overview · `/drafts` · `/sms-agent` · `/templates` · `/orders` · `/export` · `/settings`

## ডাটাবেজ
নতুন migration লাগেনি। টেমপ্লেট ও এজেন্ট কনফিগ `settings` টেবিলে (`templates.sms`, `agent.config`)।

## ingest-এ ছোট পরিবর্তন
`api/ingest/draft/route.ts` এখন `hub_rules` ও `priority.weights` ডাটাবেজ থেকে পড়ে (ব্যর্থ হলে ডিফল্ট), যাতে Settings-এর পরিবর্তন সত্যিই কাজ করে।
