/**
 * সার্ভার অ্যাকশনের প্রতিটা টেক্সট ইনপুটে বাধ্যতামূলক (DESIGN_SYSTEM §৮.৪)।
 * কন্ট্রোল ক্যারেক্টার ও `<` `>` বাদ, দৈর্ঘ্য সীমিত।
 */
export function sanitizeInput(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

/** PostgREST `.or()` ফিল্টারে বসানোর আগে সার্চ টেক্সট পরিষ্কার */
export function safeSearchTerm(value: unknown, max = 60): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^\p{L}\p{N}\s\-+_@]/gu, "").trim().slice(0, max);
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
