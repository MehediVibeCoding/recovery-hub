// সংখ্যা ইংরেজি ডিজিটে (DESIGN_SYSTEM §২.২); তারিখ বাংলায়, সময় Asia/Dhaka।
const TZ = "Asia/Dhaka";

export function formatTaka(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "৳0";
  return "৳" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatNumber(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString("en-US");
}

export function formatDateBn(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

export function formatTimeBn(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("bn-BD", { hour: "numeric", minute: "2-digit", timeZone: TZ });
}

export function formatDateTimeBn(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return `${formatDateBn(d)}, ${formatTimeBn(d)}`;
}

/** "5 মিনিট আগে" — ইংরেজি ডিজিট + বাংলা একক */
export function timeAgoBn(d: string | Date | null | undefined, now: number = Date.now()): string {
  if (!d) return "—";
  const t = (typeof d === "string" ? new Date(d) : d).getTime();
  if (Number.isNaN(t)) return "—";
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 60) return "এইমাত্র";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} মিনিট আগে`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ঘণ্টা আগে`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} দিন আগে`;
  return formatDateBn(new Date(t));
}

/** Asia/Dhaka (UTC+6) অনুযায়ী আজকের শুরু — ISO স্ট্রিং */
export function dhakaDayStartISO(offsetDays = 0, now: number = Date.now()): string {
  const OFFSET = 6 * 3600 * 1000;
  const local = new Date(now + OFFSET);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + offsetDays * 86400000;
  return new Date(startLocal - OFFSET).toISOString();
}

/** yyyy-mm-dd (ঢাকার তারিখ) → ISO; অবৈধ হলে null */
export function dhakaDateToISO(ymd: string | null | undefined, addDays = 0): string | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const t = Date.parse(`${ymd}T00:00:00+06:00`);
  if (Number.isNaN(t)) return null;
  return new Date(t + addDays * 86400000).toISOString();
}

/** ঢাকার তারিখ অনুযায়ী yyyy-mm-dd কী */
export function dhakaDateKey(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(date.getTime() + 6 * 3600 * 1000).toISOString().slice(0, 10);
}

