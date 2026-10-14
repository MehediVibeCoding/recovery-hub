import PageErrorBox from "../../components/common/PageErrorBox";
import ExportClient from "./ExportClient";
import { DATASETS, EXPORT_ROW_CAP, countRows, distinctOrderStatuses, type ExportKind } from "../../lib/data/export";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  try {
    const kinds = Object.keys(DATASETS) as ExportKind[];
    const [counts, orderStatuses] = await Promise.all([
      Promise.all(kinds.map((k) => countRows(DATASETS[k], {}))),
      distinctOrderStatuses(),
    ]);
    const datasets = kinds.map((k, i) => ({
      kind: k,
      title: DATASETS[k].title,
      description: DATASETS[k].description,
      filters: DATASETS[k].filters,
      total: counts[i],
    }));
    return <ExportClient datasets={datasets} orderStatuses={orderStatuses} cap={EXPORT_ROW_CAP} />;
  } catch (e) {
    return (
      <PageErrorBox
        title="Export Center লোড করতে সমস্যা হয়েছে"
        message={e instanceof Error ? e.message : "অজানা ত্রুটি"}
        hint="Supabase env variable ও ডাটাবেজ সংযোগ যাচাই করুন।"
      />
    );
  }
}
