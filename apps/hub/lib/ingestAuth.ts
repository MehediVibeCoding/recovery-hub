import "server-only";
import { verifyIngestRequest } from "@recovery-hub/shared";
import { getSupabaseServiceClient } from "./supabase/server";
import { writeAudit } from "./audit";
import { clientIp } from "./auth/request";
import { rateLimit } from "./auth/rateLimit";

const MAX_BODY_BYTES = 32 * 1024;

export type IngestAuthResult =
  | { ok: true; rawBody: string }
  | { ok: false; status: number; code: string; message: string };

/**
 * Phase 1 simplification: one shared signing secret from
 * INGEST_HMAC_SECRET (the store and the Hub both hold it), rather than a
 * per-key secret. The `api_keys` row is still checked (is_active, scope)
 * so a key can be revoked/rotated later without a code change — the
 * per-key secret itself is Phase 2+ once there's more than one caller.
 */
async function checkIngestAuthInner(req: Request): Promise<IngestAuthResult> {
  const apiKeyPrefix = req.headers.get("x-api-key");
  const timestamp = req.headers.get("x-timestamp");
  const signatureHex = req.headers.get("x-signature");

  if (!apiKeyPrefix || !timestamp || !signatureHex) {
    return { ok: false, status: 401, code: "auth", message: "missing auth headers" };
  }

  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return { ok: false, status: 413, code: "too_large", message: "body exceeds 32KB" };
  }

  const secret = process.env.INGEST_HMAC_SECRET;
  if (!secret) {
    return { ok: false, status: 401, code: "auth", message: "server not configured" };
  }

  const verified = verifyIngestRequest({ secret, timestamp, rawBody, signatureHex });
  if (!verified.ok) {
    return { ok: false, status: 401, code: verified.reason ?? "auth", message: "signature check failed" };
  }

  const supabase = getSupabaseServiceClient();
  const { data: key } = await supabase
    .from("api_keys")
    .select("id, is_active, scope")
    .eq("key_prefix", apiKeyPrefix)
    .eq("scope", "ingest")
    .maybeSingle();

  if (!key || !key.is_active) {
    return { ok: false, status: 401, code: "auth", message: "unknown or inactive api key" };
  }

  // Fire-and-forget — don't block the response on this.
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return { ok: true, rawBody };
}

/**
 * checkIngestAuthInner-এর ওপর পাতলা মোড়ক: ব্যর্থ হলে audit_log-এ কারণ লেখে (প্রতি কারণে মিনিটে ১টা — ফ্লাড হয় না)।
 * এতে মূল সাইট থেকে ডাটা কেন আসছে না (ভুল secret/key, পুরনো টাইমস্ট্যাম্প ইত্যাদি) audit_log দেখলেই ধরা যায়।
 */
export async function checkIngestAuth(req: Request): Promise<IngestAuthResult> {
  const result = await checkIngestAuthInner(req);
  if (!result.ok) {
    try {
      const path = new URL(req.url).pathname;
      const key = `ingest-fail:${result.code}:${path}`;
      if (await rateLimit(key, 1, 60)) {
        await writeAudit(
          "ingest.auth_failed",
          path,
          { code: result.code, message: result.message, ip: clientIp(req.headers), api_key: req.headers.get("x-api-key")?.slice(0, 24) ?? null },
          "ingest"
        );
      }
    } catch {
      /* লগ ব্যর্থ হলে মূল রেসপন্স আটকাবে না */
    }
  }
  return result;
}
