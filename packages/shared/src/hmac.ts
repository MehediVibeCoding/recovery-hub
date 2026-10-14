import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * contracts/api-contracts.md §1 — machine auth for ingest.
 * signature = hex HMAC-SHA256(secret, "<timestamp>.<raw request body>")
 */
export function signIngestRequest(
  secret: string,
  timestamp: string | number,
  rawBody: string
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

export interface VerifyResult {
  ok: boolean;
  reason?: "stale_timestamp" | "bad_signature";
}

export function verifyIngestRequest(params: {
  secret: string;
  timestamp: string;
  rawBody: string;
  signatureHex: string;
  now?: number; // unix seconds, for tests
  maxSkewSeconds?: number;
}): VerifyResult {
  const now = params.now ?? Math.floor(Date.now() / 1000);
  const ts = Number(params.timestamp);
  const maxSkew = params.maxSkewSeconds ?? 300;

  if (!Number.isFinite(ts) || Math.abs(now - ts) > maxSkew) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const expected = signIngestRequest(params.secret, params.timestamp, params.rawBody);
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(params.signatureHex, "hex");

  if (expectedBuf.length !== gotBuf.length || !timingSafeEqual(expectedBuf, gotBuf)) {
    return { ok: false, reason: "bad_signature" };
  }

  return { ok: true };
}
