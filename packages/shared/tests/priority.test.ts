import { test } from "node:test";
import assert from "node:assert/strict";
import { computePriority } from "../src/priority.ts";

test("a fresh, high-bucket, high-trust draft outranks a stale medium one", () => {
  const fresh = computePriority({
    bucket: "high",
    trustScore: 90,
    confidence: 0.8,
    cartTotal: 3000,
    minutesSinceActivity: 5,
  });
  const stale = computePriority({
    bucket: "medium",
    trustScore: 60,
    confidence: 0.5,
    cartTotal: 1000,
    minutesSinceActivity: 2000,
  });
  assert.ok(fresh > stale);
});

test("priority is a finite number", () => {
  const p = computePriority({
    bucket: "review",
    trustScore: 50,
    confidence: 0.3,
    cartTotal: 0,
    minutesSinceActivity: 0,
  });
  assert.ok(Number.isFinite(p));
});
