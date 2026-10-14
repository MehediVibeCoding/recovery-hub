import { test } from "node:test";
import assert from "node:assert/strict";
import { signIngestRequest, verifyIngestRequest } from "../src/hmac.ts";

const SECRET = "test-secret";

test("a correctly signed request verifies", () => {
  const ts = "1700000000";
  const body = '{"session_id":"abc"}';
  const sig = signIngestRequest(SECRET, ts, body);
  const result = verifyIngestRequest({
    secret: SECRET,
    timestamp: ts,
    rawBody: body,
    signatureHex: sig,
    now: 1700000010,
  });
  assert.equal(result.ok, true);
});

test("a stale timestamp is rejected", () => {
  const ts = "1700000000";
  const body = '{"session_id":"abc"}';
  const sig = signIngestRequest(SECRET, ts, body);
  const result = verifyIngestRequest({
    secret: SECRET,
    timestamp: ts,
    rawBody: body,
    signatureHex: sig,
    now: 1700000000 + 400, // > 300s skew
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "stale_timestamp");
});

test("a tampered body fails signature check", () => {
  const ts = "1700000000";
  const sig = signIngestRequest(SECRET, ts, '{"session_id":"abc"}');
  const result = verifyIngestRequest({
    secret: SECRET,
    timestamp: ts,
    rawBody: '{"session_id":"TAMPERED"}',
    signatureHex: sig,
    now: 1700000010,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad_signature");
});
