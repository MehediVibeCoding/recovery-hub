import PageErrorBox from "../../components/common/PageErrorBox";
import StockClient from "./StockClient";
import { listStockRequests, parseStockParams, type StockPage } from "../../lib/data/stock";

export const dynamic = "force-dynamic";

export default async function StockRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseStockParams(await searchParams);
  let data: StockPage;
  try {
    data = await listStockRequests(params);
  } catch (e) {
    return (
      <PageErrorBox
        title="স্টক রিকোয়েস্ট লোড করতে সমস্যা হয়েছে"
        message={e instanceof Error ? e.message : "অজানা ত্রুটি"}
        hint="Supabase env variable ও ডাটাবেজ সংযোগ যাচাই করুন (migration 0002 ও 0003 চালানো হয়েছে কিনা দেখুন)।"
      />
    );
  }
  return <StockClient data={data} params={params} />;
}
