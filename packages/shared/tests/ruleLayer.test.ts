import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRuleLayer } from "../src/ruleLayer.ts";

test("no phone -> no_contact", () => {
  const r = applyRuleLayer({ phoneNormalized: null, score: 80, confidence: 0.5 });
  assert.equal(r.bucket, "no_contact");
});

test("blocklisted -> junk, overrides a high score", () => {
  const r = applyRuleLayer({
    phoneNormalized: "01712345678",
    score: 95,
    confidence: 0.9,
    blocklisted: true,
  });
  assert.equal(r.bucket, "junk");
});

test("allowlisted -> high, overrides a low score", () => {
  const r = applyRuleLayer({
    phoneNormalized: "01712345678",
    score: 10,
    confidence: 0.1,
    allowlisted: true,
  });
  assert.equal(r.bucket, "high");
});

test("repeat returner (doc 06 finding 2) -> junk even with a clean-looking score", () => {
  const r = applyRuleLayer({
    phoneNormalized: "01712345678",
    score: 80,
    confidence: 0.6,
    history: { delivered: 0, returned: 3, cancelled: 0 },
  });
  assert.equal(r.bucket, "junk");
  assert.ok(r.flags.includes("repeat_returner"));
});

test("low confidence (doc 06 finding 1) -> review, even with a high score", () => {
  const r = applyRuleLayer({
    phoneNormalized: "01712345678",
    score: 100,
    confidence: 0.2,
  });
  assert.equal(r.bucket, "review");
  assert.ok(r.flags.includes("low_confidence"));
});

test("clean high score with no flags -> high", () => {
  const r = applyRuleLayer({
    phoneNormalized: "01712345678",
    score: 85,
    confidence: 0.8,
  });
  assert.equal(r.bucket, "high");
  assert.deepEqual(r.flags, []);
});

test("engine hardJunk -> junk (fake identity)", () => {
  const r = applyRuleLayer({ phoneNormalized: "01712345678", score: 10, confidence: 0.7, engineJunk: true });
  assert.equal(r.bucket, "junk");
  assert.ok(r.flags.includes("fake_identity"));
});

test("allowlist still wins over engine hardJunk", () => {
  const r = applyRuleLayer({ phoneNormalized: "01712345678", score: 10, confidence: 0.7, engineJunk: true, allowlisted: true });
  assert.equal(r.bucket, "high");
});

test("suspicious engine flag forces review even with a high score", () => {
  const r = applyRuleLayer({ phoneNormalized: "01712345678", score: 85, confidence: 0.8, engineFlags: ["gibberish_address"] });
  assert.equal(r.bucket, "review");
  assert.ok(r.flags.includes("gibberish_address"));
});

test("very low score -> review with low_score flag", () => {
  const r = applyRuleLayer({ phoneNormalized: "01712345678", score: 30, confidence: 0.8 });
  assert.equal(r.bucket, "review");
  assert.ok(r.flags.includes("low_score"));
});

test("a normal medium score (45-69) stays medium", () => {
  const r = applyRuleLayer({ phoneNormalized: "01712345678", score: 55, confidence: 0.8 });
  assert.equal(r.bucket, "medium");
});
