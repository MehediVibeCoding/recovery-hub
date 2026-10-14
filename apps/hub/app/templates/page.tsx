import PageErrorBox from "../../components/common/PageErrorBox";
import TemplatesClient from "./TemplatesClient";
import { loadTemplates } from "../../lib/data/templates";
import { getSupabaseServiceClient } from "../../lib/supabase/server";
import { sampleVars } from "../../lib/templates";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  try {
    const { items, saved } = await loadTemplates();
    // প্রিভিউতে স্টোরের আসল নাম
    const { data } = await getSupabaseServiceClient().from("settings").select("value").eq("key", "store.name").maybeSingle();
    const vars = sampleVars();
    if (typeof data?.value === "string" && data.value) vars.store = data.value;
    return <TemplatesClient initial={items} saved={saved} vars={vars} />;
  } catch (e) {
    return (
      <PageErrorBox
        title="টেমপ্লেট লোড করতে সমস্যা হয়েছে"
        message={e instanceof Error ? e.message : "অজানা ত্রুটি"}
        hint="Supabase env variable ও ডাটাবেজ সংযোগ যাচাই করুন।"
      />
    );
  }
}
