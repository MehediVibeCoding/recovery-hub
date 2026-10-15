# Recovery Hub — সিকিউরিটি, লগইন ও স্টক নোটিফিকেশন (সেটআপ গাইড)

## ১. 🔴 সবার আগে: লিক হওয়া secret বাতিল করুন
`docs/PHASE1-SETUP.md`-এ আগে `INGEST_HMAC_SECRET`-এর আসল মান কমিট করা ছিল, আর রিপো পাবলিক। গিট-হিস্ট্রিতে ওটা থেকে যাবে,
তাই **নতুন secret বানিয়ে তিন জায়গাতেই বদলাতে হবে** (পুরনোটা দিয়ে যে কেউ নকল ড্রাফট/স্টক-রিকোয়েস্ট পাঠাতে পারত):

1. কম্পিউটারে/ফোনের টার্মিনালে বা https://generate-secret.vercel.app/32 থেকে ৬৪ অক্ষরের হেক্স স্ট্রিং নিন (`openssl rand -hex 32`)।
2. **হাব (Cloudflare)** → `INGEST_HMAC_SECRET` = নতুন মান
3. **মূল সাইট (Vangcur)** → `RECOVERY_HUB_HMAC_SECRET` = হুবহু একই মান
4. **Mehediadmin (Vercel)** → `RECOVERY_HUB_HMAC_SECRET` = হুবহু একই মান
5. তিনটাই রিডিপ্লয়। (এক জায়গায় ভুল থাকলে সেই পথের ডাটা `401` খাবে — নিচের §৭ দেখুন।)

## ২. যা বদলেছে (সংক্ষেপে)
| বিষয় | আগে | এখন |
|---|---|---|
| হাবে প্রবেশ | HTTP Basic Auth (ব্রাউজার পুরনো ভুল পাসওয়ার্ড মনে রেখে চুপচাপ ফেল করছিল — তাই incognito-তে চলত, সাধারণ ব্রাউজারে না) | সই করা সেশন-কুকি। সেশন ছাড়া **সব URL-এ সাধারণ 404** |
| বৈধ প্রবেশপথ | — | ১) Mehediadmin সাইডবারের **"রিকভারি হাব"** (এক ক্লিক, ইমেইল/পাসওয়ার্ড লাগে না) ২) গোপন লগইন পাথ + Supabase Auth |
| সিকিউরিটি হেডার | নেই | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP, noindex |
| ডাটাবেজ | anon/authenticated-এর সব টেবিল-গ্র্যান্ট খোলা, ভিউ RLS বাইপাস করত, ফাংশন anon কল করতে পারত | সব বন্ধ (migration `0003`, **লাইভ ডাটাবেজে প্রয়োগ করা হয়ে গেছে**) |
| স্টক রিকোয়েস্ট | শুধু ডাটাবেজে জমত, দেখার পেজ ছিল না | নতুন `/stock` পেজ + অ্যাডমিন থেকে "স্টকে ফিরেছে" সিগন্যাল |
| ingest ব্যর্থতা | নিঃশব্দ | হাবের `audit_log`-এ কারণসহ লেখা হয়; মূল সাইটও এখন লগ করে |

প্রতিরক্ষার স্তর: (১) middleware → (২) ডাটা-লেয়ার, প্রতিটা সার্ভার অ্যাকশন ও export API নিজে সেশন যাচাই করে → (৩) ডাটাবেজে RLS + গ্র্যান্ট বন্ধ → (৪) লগইনে রেট-লিমিট (ডাটাবেজে গোনা, প্রতি IP ১০ মিনিটে ৫ বার), Turnstile (ঐচ্ছিক), ইমেইল অবশ্যই `HUB_ADMIN_EMAIL`, এক-বার-ব্যবহারযোগ্য SSO টোকেন।

## ৩. হাবের Supabase প্রজেক্টে করণীয় (একবার)
1. **Authentication → Users → Add user → Create new user**: আপনার ইমেইল + শক্ত পাসওয়ার্ড, "Auto Confirm User" টিক দিন।
2. **Authentication → Sign In / Providers (Settings)** → **"Allow new users to sign up" বন্ধ করুন** (নইলে যে কেউ অ্যাকাউন্ট খুলতে পারে; যদিও `HUB_ADMIN_EMAIL` ছাড়া ঢুকতে পারবে না)।
3. **Project Settings → API**: `anon` key কপি করুন → হাবের `SUPABASE_ANON_KEY`; `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`।

## ৪. Environment variables — কোথায় কী বসবে

### ক) হাব — Cloudflare → Workers → `recovery-hub` → Settings → Variables and Secrets
| নাম | মান | ধরন |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://epfmbpqiybnuxkqfxrtx.supabase.co` | Text |
| `SUPABASE_SERVICE_ROLE_KEY` | হাব-প্রজেক্টের service_role | Secret |
| `SUPABASE_ANON_KEY` | হাব-প্রজেক্টের anon | Text |
| `INGEST_HMAC_SECRET` | §১-এর নতুন মান | Secret |
| `HUB_SESSION_SECRET` | নতুন র‍্যান্ডম ≥৩২ অক্ষর (বদলালে সব সেশন বাতিল) | Secret |
| `HUB_SSO_SECRET` | নতুন র‍্যান্ডম ≥৩২ অক্ষর (Mehediadmin-এও হুবহু একই) | Secret |
| `HUB_ADMIN_EMAIL` | §৩-এ বানানো ইমেইল | Text |
| `HUB_LOGIN_PATH` | গোপন পাথ, যেমন `enter-` + ১৬+ র‍্যান্ডম অক্ষর (শুরুতে `/` নয়) | Text |
| *(ঐচ্ছিক)* `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `HUB_SESSION_HOURS` | | |

পুরনো `HUB_ADMIN_PASSWORD` ও `HUB_ADMIN_USER` **মুছে দিন** (আর কাজে লাগে না)।
গোপন লগইন লিংক: `https://<আপনার-হাব>.workers.dev/<HUB_LOGIN_PATH>` — বুকমার্ক করে রাখুন, কাউকে দেবেন না।

### খ) Mehediadmin — Vercel
| নাম | মান |
|---|---|
| `RECOVERY_HUB_BASE_URL` | হাবের URL, `https://` দিয়ে, শেষে `/` ছাড়া |
| `HUB_SSO_SECRET` | হাবের সাথে হুবহু একই |
| `RECOVERY_HUB_INGEST_KEY` | `rhk_38dee933d7f84c7a` (হাবের `api_keys.key_prefix`-এর মান) |
| `RECOVERY_HUB_HMAC_SECRET` | §১-এর নতুন মান |

### গ) মূল সাইট (Vangcur) — যেখানে হোস্ট করা আছে
`RECOVERY_HUB_BASE_URL`, `RECOVERY_HUB_INGEST_KEY` (= `rhk_38dee933d7f84c7a`), `RECOVERY_HUB_HMAC_SECRET` (= §১-এর নতুন মান)।
এই তিনটার একটাও না থাকলে ড্রাফট/স্টক-রিকোয়েস্ট **চুপচাপ হারিয়ে যায়** — আপনার ড্রাফট না আসার সবচেয়ে সম্ভাব্য কারণ এটাই।

## ৫. ডিপ্লয়ের ক্রম
1. ডাটাবেজ migration `0003` ইতিমধ্যে লাইভে প্রয়োগ হয়েছে (ফাইলটা রিপোতেও আছে: `apps/hub/supabase/migrations/0003_security_and_stock.sql`)।
2. ZIP-এর ফাইলগুলো তিন রিপোতে আপলোড (পথ `README_UPLOAD_MAP.txt`-এ)।
3. §৩ ও §৪ অনুযায়ী Supabase + env বসান, তারপর তিন জায়গায় রিডিপ্লয়।

## ৬. পরীক্ষা (ডিপ্লয়ের পর)
- [ ] সাধারণ ব্রাউজারে (সেশন ছাড়া) হাবের মূল URL খুললে শুধু `404 Not Found`।
- [ ] Mehediadmin-এ লগইন → সাইডবার **"রিকভারি হাব"** → নতুন ট্যাবে সরাসরি Overview, পাসওয়ার্ড ছাড়া।
- [ ] গোপন লগইন লিংকে ইমেইল+পাসওয়ার্ড দিলে ঢোকে; ভুল পাসওয়ার্ডে "ভুল ইমেইল বা পাসওয়ার্ড"।
- [ ] হাবে লগআউট → আবার সব URL-এ 404।
- [ ] https://securityheaders.com-এ হাব URL দিলে (সেশনের বাইরে) হেডারগুলো দেখা যায়।

## ৭. ড্রাফট/স্টক রিকোয়েস্ট হাবে না এলে — কীভাবে ধরবেন
মূল সাইটে একটা টেস্ট অর্ডার ধাপ ২-এ নিয়ে ছেড়ে দিন (ফোন নম্বর দিতে হবে), তারপর **হাবের Supabase → SQL Editor**-এ:
```sql
select created_at, action, target, detail from audit_log
where actor = 'ingest' order by created_at desc limit 20;
select count(*) from checkout_drafts;
```
| ফল | মানে | করণীয় |
|---|---|---|
| `checkout_drafts`-এ রো এসেছে | ঠিক আছে ✅ | — |
| `audit_log`-এ `ingest.auth_failed`, code `bad_signature` | মূল সাইটের `RECOVERY_HUB_HMAC_SECRET` ≠ হাবের `INGEST_HMAC_SECRET` | মিলিয়ে দিন |
| code `stale_timestamp` | সার্ভারের ঘড়ি ৫ মিনিটের বেশি আলাদা | সাধারণত নয়; আবার চেষ্টা |
| code `auth`, message `unknown or inactive api key` | `RECOVERY_HUB_INGEST_KEY` ≠ `rhk_38dee933d7f84c7a` | মিলিয়ে দিন |
| কিছুই আসেনি, `audit_log`-ও ফাঁকা | রিকোয়েস্ট হাব পর্যন্ত পৌঁছায়নি — মূল সাইটে ৩টা env-এর কোনোটা নেই, বা `RECOVERY_HUB_BASE_URL` ভুল | মূল সাইটের লগে `[RecoveryHub]` লাইন দেখুন (এখন কারণসহ লেখে) |

এই ডিপ্লয়ে ড্রাফট পাঠানোও উন্নত হয়েছে: আগে শুধু ধাপ ২-এ পৌঁছানো ও ট্যাব লুকানোর সময় যেত; এখন চেকআউট পেজ ছেড়ে গেলে (অ্যাপের ভেতরে "ব্যাক"-ও) এবং ধাপ ২-এর পরে ফিল্ড বদলে ৬ সেকেন্ড থামলে আবার যায়।

## ৮. স্টক নোটিফিকেশন কীভাবে চলে
1. গ্রাহক মূল সাইটে "স্টকে এলে জানান" দিলে → হাবের `stock_requests`-এ জমে (`অপেক্ষায়`)।
2. আপনি Mehediadmin-এ কোনো প্রোডাক্টের স্টক **০ থেকে বাড়ালে** (টেবিলের কুইক-এডিট বা প্রোডাক্ট এডিট ফর্ম থেকে) → অ্যাডমিন হাবকে সিগন্যাল পাঠায় → ওই প্রোডাক্টের সব `অপেক্ষায়` রিকোয়েস্ট `স্টকে ফিরেছে` হয়।
3. হাবের **Stock Requests** পেজে "জানাতে হবে" তালিকা। **কল** বাটনে সরাসরি ফোন, আপনি নিজে জানিয়ে **জানানো হয়েছে** চিহ্নিত করেন (প্রোডাক্ট ধরে "সবাইকে জানানো হয়েছে"-ও আছে)।
4. অটো SMS/মেসেজ **বন্ধ** — Agent এখনো stub, কিছু পাঠায় না।

সীমা: অর্ডার বাতিলে স্টক ফেরত এলে (restore) এখনো সিগন্যাল যায় না — শুধু অ্যাডমিনের ম্যানুয়াল স্টক বদলে যায়।

## ৯. জানা সমস্যা (কোড বদলাইনি, শুধু জানাচ্ছি)
- `apps/hub/package.json`-এ `next@15.5.24` পিন করা, কিন্তু `@opennextjs/cloudflare@^1` এর নতুন সংস্করণ `next >=15.5.27` চায়। রিপোতে lockfile নেই, তাই `npm install` কখনো ERESOLVE দিতে পারে। Cloudflare বিল্ড ফেল করলে `next`-কে `15.5.27`+ করুন।
