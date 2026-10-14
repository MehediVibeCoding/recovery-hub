import "server-only";

export function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "অজানা ডাটাবেজ ত্রুটি"}`);
}

export function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function pageParam(v: string | string[] | undefined): number {
  const n = parseInt(Array.isArray(v) ? v[0] : v ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10000) : 1;
}

export function strParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").toString();
}
