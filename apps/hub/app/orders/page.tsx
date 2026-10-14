import PageErrorBox from "../../components/common/PageErrorBox";
import OrdersClient from "./OrdersClient";
import { listOrders, parseOrdersParams, type OrdersPage } from "../../lib/data/orders";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseOrdersParams(await searchParams);
  let data: OrdersPage;
  try {
    data = await listOrders(params);
  } catch (e) {
    return (
      <PageErrorBox
        title="অর্ডার ব্যাকআপ লোড করতে সমস্যা হয়েছে"
        message={e instanceof Error ? e.message : "অজানা ত্রুটি"}
        hint="Supabase env variable ও ডাটাবেজ সংযোগ যাচাই করুন।"
      />
    );
  }
  return <OrdersClient data={data} params={params} />;
}
