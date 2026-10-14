import PageErrorBox from "../../components/common/PageErrorBox";
import SettingsClient from "./SettingsClient";
import { getSettingsPage } from "../../lib/data/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  try {
    const data = await getSettingsPage();
    return <SettingsClient data={data} />;
  } catch (e) {
    return (
      <PageErrorBox
        title="Settings লোড করতে সমস্যা হয়েছে"
        message={e instanceof Error ? e.message : "অজানা ত্রুটি"}
        hint="Supabase env variable ও ডাটাবেজ সংযোগ যাচাই করুন।"
      />
    );
  }
}
