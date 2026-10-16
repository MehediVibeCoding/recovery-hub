import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreDraft } from "../src/index.ts";
import { containsAny, GENERIC_NAME_WORDS, PROFANITY_WORDS } from "../src/data/wordlists.ts";

const GOOD = {
  name: "রাকিব হাসান",
  phoneRaw: "01712345679",
  address: "বাড়ি ৫, রোড ২, ধানমন্ডি, ঢাকা",
  district: "ঢাকা",
  cartTotal: 1800,
  hourOfDay: 15,
};

test("draft with no usable phone is no_contact", () => {
  const r = scoreDraft({});
  assert.equal(r.bucket, "no_contact");
  assert.equal(r.phoneNormalized, null);
  assert.equal(r.confidence, 0);
});

test("draft with only a phone has low confidence", () => {
  const r = scoreDraft({ phoneRaw: "+8801755443322" });
  assert.equal(r.phoneNormalized, "01755443322");
  assert.ok(r.confidence < 0.3, `confidence was ${r.confidence}`);
});

test("a well-formed, fleshed-out draft scores high", () => {
  const r = scoreDraft(GOOD);
  assert.equal(r.bucket, "high");
  assert.ok(r.score >= 85, `score was ${r.score}`);
  assert.deepEqual(r.flags, []);
});

test("English address with house/road also scores high", () => {
  const r = scoreDraft({ ...GOOD, name: "Sana Rahman", address: "House 12, Road 5, Mirpur 10, Dhaka" });
  assert.equal(r.bucket, "high");
});

// ── আসল সমস্যা: স্ক্রিনশটের দুটো উল্টাপাল্টা ঠিকানা আগে Trust 100 পেত ──
test("REGRESSION: gibberish delivery address no longer gets trust 100", () => {
  for (const address of ["Sbbsnsnsjsja bsnsjajajaja bahaj", "Vsbsbsb bsbsnsjs sbnsns"]) {
    const r = scoreDraft({ name: "Mehedu", phoneRaw: "01843464949", address, district: "খুলনা", cartTotal: 1598, hourOfDay: 9 });
    assert.ok(r.score <= 30, `score was ${r.score} for "${address}"`);
    assert.ok(r.flags.includes("gibberish_address"));
    assert.notEqual(r.bucket, "high");
  }
});

test("keyboard mash / repeated syllables / order-cancel text in the address are caught", () => {
  for (const address of ["asdfghjkl road", "hdhdhdhd hdhdhd", "kkkkkkkk ppp", "টাকা নাই পাঠাবেন না"]) {
    const r = scoreDraft({ ...GOOD, address });
    assert.ok(r.score <= 30, `score was ${r.score} for "${address}"`);
  }
});

test("a too-short address cannot reach high", () => {
  const r = scoreDraft({ ...GOOD, address: "ঢাকা" });
  assert.notEqual(r.bucket, "high");
});

test("missing address: never High, but not punished as fake", () => {
  const r = scoreDraft({ name: "Karim Uddin", phoneRaw: "01755443322", cartTotal: 900 });
  assert.ok(r.score <= 69);
  assert.equal(r.flags.length, 0);
});

test("address that names a different district than selected is flagged", () => {
  const r = scoreDraft({ ...GOOD, address: "Feni Sadar, House 5, Road 3", district: "ঢাকা" });
  assert.ok(r.flags.includes("district_mismatch"));
  assert.ok(r.score <= 60);
});

test("another district mentioned in the address does NOT cause a false mismatch", () => {
  const r = scoreDraft({ ...GOOD, address: "Mymensingh Road, House 5, Dhaka", district: "ঢাকা" });
  assert.ok(!r.flags.includes("district_mismatch"));
  assert.equal(r.bucket, "high");
});

test("dummy / sequential phone numbers are capped", () => {
  const r = scoreDraft({ ...GOOD, phoneRaw: "01712345678" });
  assert.ok(r.score <= 40);
  assert.ok(r.flags.includes("suspicious_phone"));
});

test("gibberish name is capped", () => {
  const r = scoreDraft({ ...GOOD, name: "asdfgh jkl" });
  assert.ok(r.score <= 45);
  assert.ok(r.flags.includes("bad_name"));
});

test("name + address + phone all fake -> hard junk", () => {
  const r = scoreDraft({ name: "asdfgh", phoneRaw: "01711111111", address: "Sbbsnsnsjsja bsnsjajajaja", district: "ঢাকা", cartTotal: 900 });
  assert.equal(r.hardJunk, true);
  assert.equal(r.bucket, "junk");
  assert.ok(r.score <= 10);
});

test("disposable email is capped", () => {
  const r = scoreDraft({ ...GOOD, email: "x@mailinator.com" });
  assert.ok(r.flags.includes("disposable_email"));
  assert.ok(r.score <= 35);
});

test("a proven returning customer scores at least as well as a new one", () => {
  const fresh = scoreDraft(GOOD);
  const returning = scoreDraft({ ...GOOD, history: { delivered: 3, returned: 0, cancelled: 0 } });
  assert.ok(returning.score >= fresh.score, `${returning.score} < ${fresh.score}`);
});

test("history of cancellations lowers the score", () => {
  const fresh = scoreDraft(GOOD);
  const bad = scoreDraft({ ...GOOD, history: { delivered: 0, returned: 1, cancelled: 2 } });
  assert.ok(bad.score < fresh.score);
});

test("empty cart (total 0) is 'unknown', not a penalty", () => {
  const r = scoreDraft({ ...GOOD, cartTotal: 0 });
  assert.equal(r.bucket, "high");
});

test("word matching has no false positives on common names/words", () => {
  // মেইন সাইটের সাবস্ট্রিং মিলে এগুলো ভুলভাবে ধরা পড়ত
  assert.equal(containsAny("ইকবাল হোসেন", PROFANITY_WORDS), null);
  for (const name of ["Sana Rahman", "Sirajul Islam", "Nabila Khan", "আব্দুল মালিক", "Anisur Rahman"]) {
    const r = scoreDraft({ ...GOOD, name });
    assert.ok(!r.factors.some((f) => f.module === "name" && f.reason.includes("জেনেরিক")), name);
    assert.ok(!r.flags.includes("bad_name"), name);
  }
  assert.equal(scoreDraft({ ...GOOD, address: "Latest Plaza, Road 3, Sylhet", district: "সিলেট" }).bucket, "high");
  // কিন্তু আসল জেনেরিক নাম ঠিকই ধরা পড়ে
  assert.ok(containsAny("customer", GENERIC_NAME_WORDS) !== null);
  const g = scoreDraft({ ...GOOD, name: "Customer" });
  assert.ok(g.factors.some((f) => f.module === "name" && f.reason.includes("জেনেরিক")));
});

test("factors expose points and max so the UI can show 'earned / possible'", () => {
  const r = scoreDraft(GOOD);
  const addr = r.factors.find((f) => f.module === "address");
  assert.ok(addr && typeof addr.points === "number" && addr.max === 30);
});
