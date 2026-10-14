import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreDraft } from "../src/index.ts";

test("draft with no usable phone is no_contact", () => {
  const result = scoreDraft({});
  assert.equal(result.bucket, "no_contact");
  assert.equal(result.phoneNormalized, null);
  assert.equal(result.confidence, 0);
});

test("draft with only a phone has low confidence (doc 06 finding 1)", () => {
  const result = scoreDraft({ phoneRaw: "+8801712345678" });
  assert.equal(result.phoneNormalized, "01712345678");
  assert.ok(result.confidence < 0.3, `confidence was ${result.confidence}`);
});

test("a well-formed, fleshed-out draft scores high with high confidence", () => {
  const result = scoreDraft({
    phoneRaw: "01712345679",
    address: "বাড়ি ৫, রোড ২, ধানমন্ডি, ঢাকা",
    district: "ঢাকা",
    cartTotal: 1800,
    cartItems: [{ id: "p1", qty: 1 }],
    hourOfDay: 15,
    behavior: { honeypotFilled: false, humanInteraction: true },
  });
  assert.equal(result.bucket, "high");
  assert.equal(result.confidence, 1);
});

test("honeypot filled drags the score down", () => {
  const result = scoreDraft({
    phoneRaw: "01933445566",
    address: "road 1 test",
    cartTotal: 1200,
    cartItems: [{ id: "p1", qty: 1 }],
    hourOfDay: 4,
    behavior: { honeypotFilled: true, humanInteraction: false },
  });
  assert.notEqual(result.bucket, "high");
});
