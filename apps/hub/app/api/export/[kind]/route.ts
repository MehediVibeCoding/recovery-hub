import "server-only";
import { NextResponse } from "next/server";
import { toCsv } from "../../../../lib/csv";
import { writeAudit } from "../../../../lib/audit";
import { DATASETS, EXPORT_ROW_CAP, fetchRows, type ExportKind } from "../../../../lib/data/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/export/<drafts|orders|contacts|audit>?from=YYYY-MM-DD&to=YYYY-MM-DD&status=&bucket=&dnc=1
// অ্যাডমিন গেট (middleware.ts) এই রুটকেও ঢাকে।
export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!(kind in DATASETS)) {
    return NextResponse.json({ error: "অজানা এক্সপোর্ট ধরন" }, { status: 404 });
  }
  const ds = DATASETS[kind as ExportKind];
  const url = new URL(req.url);
  const filters = {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    bucket: url.searchParams.get("bucket") ?? undefined,
    dnc: url.searchParams.get("dnc") ?? undefined,
  };

  try {
    const { rows, truncated } = await fetchRows(ds, filters);
    const csv = toCsv(ds.columns, rows);
    await writeAudit("export", ds.kind, { rows: rows.length, truncated, filters });

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="recovery-hub-${ds.kind}-${stamp}.csv"`,
        "cache-control": "no-store",
        "x-export-rows": String(rows.length),
        "x-export-truncated": truncated ? `true (cap ${EXPORT_ROW_CAP})` : "false",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "এক্সপোর্ট ব্যর্থ" }, { status: 500 });
  }
}
