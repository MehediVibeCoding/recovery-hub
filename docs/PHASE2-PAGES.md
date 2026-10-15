# Phase 2 — অ্যাডমিন পেজ

## প্রবেশ ও এনভায়রনমেন্ট
Basic-Auth গেট আর নেই (`HUB_ADMIN_PASSWORD`/`HUB_ADMIN_USER` এখন অপ্রয়োজনীয়, মুছে দিন)।
এখন: সেশন-কুকি গেট (বৈধ সেশন ছাড়া সব URL-এ 404) — Mehediadmin-এর সাইডবার থেকে এক-ক্লিক প্রবেশ,
অথবা গোপন লগইন পাথে Supabase Auth। পুরো তালিকা ও ধাপ: `docs/SECURITY-AND-SETUP.md`।

`/api/ingest/*` গেটের বাইরে (HMAC দিয়েই সুরক্ষিত)।

## পেজ
`/` Overview · `/drafts` · `/stock` · `/sms-agent` · `/templates` · `/orders` · `/export` · `/settings`

## ডাটাবেজ
নতুন migration লাগেনি। টেমপ্লেট ও এজেন্ট কনফিগ `settings` টেবিলে (`templates.sms`, `agent.config`)।

## ingest-এ ছোট পরিবর্তন
`api/ingest/draft/route.ts` এখন `hub_rules` ও `priority.weights` ডাটাবেজ থেকে পড়ে (ব্যর্থ হলে ডিফল্ট), যাতে Settings-এর পরিবর্তন সত্যিই কাজ করে।
