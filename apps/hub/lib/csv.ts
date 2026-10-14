/** CSV — Excel-এ বাংলা ঠিক দেখাতে UTF-8 BOM, আর ফর্মুলা-ইনজেকশন (=,+,-,@) ঠেকানো। */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) s = v.join("; ");
  else if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  const head = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(","));
  return "\uFEFF" + [head, ...body].join("\r\n") + "\r\n";
}
