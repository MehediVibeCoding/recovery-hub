import { test } from "node:test";
import assert from "node:assert/strict";
import { DraftIngestSchema } from "../src/schemas.ts";

test("valid draft with only phone passes", () => {
  const result = DraftIngestSchema.safeParse({
    session_id: "sess_abcdefgh123",
    phone: "01712345678",
    cart_total: 1500,
  });
  assert.equal(result.success, true);
});

test("draft with neither phone nor email is rejected", () => {
  const result = DraftIngestSchema.safeParse({
    session_id: "sess_abcdefgh123",
    cart_total: 1500,
  });
  assert.equal(result.success, false);
});

test("unknown fields are rejected", () => {
  const result = DraftIngestSchema.safeParse({
    session_id: "sess_abcdefgh123",
    phone: "01712345678",
    some_unknown_field: "x",
  });
  assert.equal(result.success, false);
});

test("session_id too short is rejected", () => {
  const result = DraftIngestSchema.safeParse({
    session_id: "short",
    phone: "01712345678",
  });
  assert.equal(result.success, false);
});
