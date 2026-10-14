import PageErrorBox from "../../components/common/PageErrorBox";
import DraftsClient from "./DraftsClient";
import { listDrafts, parseDraftsParams, type DraftsPage } from "../../lib/data/drafts";

export const dynamic = "force-dynamic";

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseDraftsParams(await searchParams);
  let data: DraftsPage;
  try {
    data = await listDrafts(params);
  } catch (e) {
    return (
      <PageErrorBox
        title="ড্রাফট লোড করতে সমস্যা হয়েছে"
        message={e instanceof Error ? e.message : "অজানা ত্রুটি"}
        hint="Supabase env variable ও ডাটাবেজ সংযোগ যাচাই করুন।"
      />
    );
  }
  return <DraftsClient data={data} params={params} />;
}
