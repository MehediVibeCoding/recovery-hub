import PageErrorBox from "../../components/common/PageErrorBox";
import AgentClient from "./AgentClient";
import { getAgentPage, type AgentPageData } from "../../lib/data/agent";

export const dynamic = "force-dynamic";

export default async function SmsAgentPage() {
  let data: AgentPageData;
  try {
    data = await getAgentPage();
  } catch (e) {
    return (
      <PageErrorBox
        title="SMS Agent লোড করতে সমস্যা হয়েছে"
        message={e instanceof Error ? e.message : "অজানা ত্রুটি"}
        hint="Supabase env variable ও ডাটাবেজ সংযোগ যাচাই করুন।"
      />
    );
  }
  return <AgentClient data={data} />;
}
