import Link from "next/link";
import Pill from "../components/common/Pill";
import SectionHeading from "../components/common/SectionHeading";
import StatTile from "../components/common/StatTile";
import PageErrorBox from "../components/common/PageErrorBox";
import { getOverview, type OverviewData } from "../lib/data/overview";
import { BUCKET_META, STATUS_META, auditLabel } from "../lib/labels";
import { formatNumber, formatTaka, timeAgoBn } from "../lib/format";
import type { Bucket } from "../lib/types";

export const dynamic = "force-dynamic";

const AGENT_LABEL: Record<OverviewData["agent"]["state"], { text: string; sub: string }> = {
  none: { text: "সংযুক্ত নয়", sub: "Android gateway পরের ধাপে" },
  online: { text: "অনলাইন", sub: "" },
  offline: { text: "অফলাইন", sub: "" },
};

export default async function OverviewPage() {
  let d: OverviewData;
  try {
    d = await getOverview();
  } catch (e) {
    return (
      <PageErrorBox
        title="ওভারভিউ লোড করতে সমস্যা হয়েছে"
        message={e instanceof Error ? e.message : "অজানা ত্রুটি"}
        hint="Supabase env variable ও ডাটাবেজ সংযোগ যাচাই করুন।"
      />
    );
  }

  const agent = AGENT_LABEL[d.agent.state];
  const maxDay = Math.max(1, ...d.perDay.map((x) => x.count));
  const buckets = Object.keys(BUCKET_META) as Bucket[];

  return (
    <div className="space-y-8">
      <section>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <StatTile icon="inbox" label="আজকের Drafts" value={formatNumber(d.draftsToday)} sub={`৭ দিনে ${formatNumber(d.drafts7d)}টি`} />
          <StatTile icon="check" label="Recovered (7d)" value={formatNumber(d.recovered7d)} sub={`৩০ দিনে ${formatNumber(d.recovered30d)}টি`} />
          <StatTile
            icon="refresh"
            label="Recovery Rate"
            value={d.recoveryRate === null ? "—" : `${d.recoveryRate}%`}
            sub={d.recoveryRate === null ? "৭ দিনে কোনো ড্রাফট নেই" : "৭ দিনের রিকভারি ÷ ড্রাফট"}
          />
          <StatTile
            icon="chat"
            label="Agent Status"
            value={agent.text}
            sub={d.agent.lastSeen ? `শেষ সক্রিয় ${timeAgoBn(d.agent.lastSeen)}` : agent.sub}
          />
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <StatTile icon="download" label="রিকভার্ড ভ্যালু (30d)" value={formatTaka(d.recoveredValue30d)} />
          <StatTile icon="clock" label="পেন্ডিং ভ্যালু" value={formatTaka(d.pendingValue)} sub="High + Medium, খোলা ড্রাফট" />
          <StatTile icon="box" label="অর্ডার ব্যাকআপ (7d)" value={formatNumber(d.orders7d)} sub={formatTaka(d.ordersValue7d)} />
          <StatTile icon="shield" label="খোলা ড্রাফট" value={formatNumber(d.openTotal)} sub="Draft + Contacted" />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeading hint="ঢাকার সময় অনুযায়ী, আজসহ ৭ দিন">দৈনিক ড্রাফট</SectionHeading>
          <div className="rounded-[24px] border border-white/90 bg-white p-4 shadow-sh1">
            <div className="flex h-40 items-end gap-2" role="img" aria-label="গত ৭ দিনের দৈনিক ড্রাফট সংখ্যা">
              {d.perDay.map((day, i) => {
                const h = Math.round((day.count / maxDay) * 100);
                const today = i === d.perDay.length - 1;
                return (
                  <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="font-body text-[11px] font-black text-ink">{day.count}</span>
                    <div
                      className={`w-full rounded-t-xl ${today ? "bg-brand-light" : "bg-brand-light/35"}`}
                      style={{ height: `${Math.max(h, day.count > 0 ? 6 : 2)}%` }}
                    />
                    <span className="font-body text-[10.5px] font-extrabold text-muted">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <SectionHeading hint="Draft + Contacted স্ট্যাটাসের ড্রাফট">বাকেট অনুযায়ী খোলা ড্রাফট</SectionHeading>
          <div className="space-y-2 rounded-[24px] border border-white/90 bg-white p-4 shadow-sh1">
            {buckets.map((b) => {
              const c = d.openByBucket[b] ?? 0;
              const pct = d.openTotal > 0 ? Math.round((c / d.openTotal) * 100) : 0;
              return (
                <Link
                  key={b}
                  href={`/drafts?bucket=${b}`}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors duration-brand hover:bg-brand-bg/25"
                >
                  <span className="w-[92px] shrink-0">
                    <Pill tone={BUCKET_META[b].tone}>{BUCKET_META[b].label}</Pill>
                  </span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <span className="block h-full rounded-full bg-brand-light" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-10 shrink-0 text-right font-body text-[13px] font-black text-ink">{c}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeading>সাম্প্রতিক ড্রাফট</SectionHeading>
          <div className="overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-sh1">
            {d.recentDrafts.length === 0 ? (
              <p className="px-5 py-10 text-center font-body text-[13px] font-semibold text-muted">
                এখনো কোনো ড্রাফট আসেনি — Vangcur checkout সংযুক্ত হলে এখানে দেখা যাবে।
              </p>
            ) : (
              <ul className="divide-y divide-border-base/40">
                {d.recentDrafts.map((r) => (
                  <li key={r.id}>
                    <Link href="/drafts" className="flex items-center gap-3 px-4 py-3 transition-colors duration-brand hover:bg-brand-bg/25">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-body text-[13.5px] font-extrabold text-ink">{r.customer_name || "নাম নেই"}</div>
                        <div className="truncate font-body text-[11px] font-semibold text-muted">
                          {r.phone || "ফোন নেই"} · {timeAgoBn(r.last_activity_at)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-body text-[14px] font-black text-ink">{formatTaka(r.cart_total)}</div>
                        <Pill tone={STATUS_META[r.status].tone} className="mt-1">
                          {STATUS_META[r.status].label}
                        </Pill>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <SectionHeading>সাম্প্রতিক অ্যাকটিভিটি</SectionHeading>
          <div className="overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-sh1">
            {d.recentAudit.length === 0 ? (
              <p className="px-5 py-10 text-center font-body text-[13px] font-semibold text-muted">এখনো কোনো অ্যাডমিন অ্যাকশন নেই।</p>
            ) : (
              <ul className="divide-y divide-border-base/40">
                {d.recentAudit.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-body text-[13.5px] font-extrabold text-ink">{auditLabel(a.action)}</div>
                      <div className="truncate font-body text-[11px] font-semibold text-muted">
                        {a.actor}
                        {a.target ? ` · ${a.target}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 font-body text-[11px] font-semibold text-muted">{timeAgoBn(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
