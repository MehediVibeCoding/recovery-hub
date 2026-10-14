"use client";

import { useState } from "react";
import Pagination from "../../components/common/Pagination";
import Pill from "../../components/common/Pill";
import Icon from "../../components/common/Icon";
import EmptyState from "../../components/common/EmptyState";
import { Chip, ChipRow, ResetChip, SearchBox, ToolbarSelect } from "../../components/common/Toolbar";
import { useQueryNav } from "../../components/common/useQueryNav";
import DraftDetailModal from "./DraftDetailModal";
import { BUCKET_META, FLAG_LABELS, STATUS_META } from "../../lib/labels";
import { formatTaka, timeAgoBn } from "../../lib/format";
import type { DraftsPage, DraftsParams, StatusFilter } from "../../lib/data/drafts";
import type { Bucket, DraftRow } from "../../lib/types";

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: "open", label: "সক্রিয়" },
  { key: "draft", label: "Draft" },
  { key: "contacted", label: "Contacted" },
  { key: "recovered", label: "Recovered" },
  { key: "lost", label: "Lost" },
  { key: "invalid", label: "Invalid" },
  { key: "junk", label: "Junk" },
  { key: "all", label: "সব" },
];

function itemsSummary(r: DraftRow): string {
  const items = Array.isArray(r.cart_items) ? r.cart_items : [];
  if (items.length === 0) return "কার্ট খালি";
  const first = items[0]?.name || "আইটেম";
  return items.length > 1 ? `${first} +${items.length - 1}` : first;
}

function trustTone(score: number | null) {
  if (score === null) return "gray" as const;
  if (score >= 70) return "green" as const;
  if (score >= 40) return "amber" as const;
  return "red" as const;
}

export default function DraftsClient({ data, params }: { data: DraftsPage; params: DraftsParams }) {
  const current: Record<string, string> = {};
  if (params.status !== "open") current.status = params.status;
  if (params.bucket !== "all") current.bucket = params.bucket;
  if (params.q) current.q = params.q;
  if (params.sort !== "priority") current.sort = params.sort;
  if (params.page > 1) current.page = String(params.page);

  const { set, reset, pending } = useQueryNav(current);
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = params.status !== "open" || params.bucket !== "all" || params.q !== "" || params.sort !== "priority";

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={pending ? "opacity-70 transition-opacity" : "transition-opacity"}>
      {/* টুলবার */}
      <div className="mb-4 rounded-[24px] border border-white/90 bg-white p-3.5 shadow-sh1 sm:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <SearchBox
            value={params.q}
            onSearch={(q) => set({ q })}
            placeholder="নাম, ফোন বা ইমেইল দিয়ে খুঁজুন..."
          />
          <div className="grid grid-cols-2 gap-2.5 lg:flex lg:w-auto">
            <ToolbarSelect label="বাকেট ফিল্টার" value={params.bucket} onChange={(v) => set({ bucket: v === "all" ? null : v })} className="lg:w-[170px]">
              <option value="all">সব বাকেট</option>
              {(Object.keys(BUCKET_META) as Bucket[]).map((b) => (
                <option key={b} value={b}>
                  {BUCKET_META[b].label}
                </option>
              ))}
            </ToolbarSelect>
            <ToolbarSelect label="সাজানো" value={params.sort} onChange={(v) => set({ sort: v === "priority" ? null : v })} className="lg:w-[170px]">
              <option value="priority">প্রায়োরিটি অনুযায়ী</option>
              <option value="latest">সর্বশেষ অ্যাক্টিভিটি</option>
              <option value="value">কার্ট ভ্যালু</option>
            </ToolbarSelect>
          </div>
        </div>
        <ChipRow>
          {STATUS_CHIPS.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              count={data.counts[c.key]}
              active={params.status === c.key}
              onClick={() => set({ status: c.key === "open" ? null : c.key })}
            />
          ))}
          {filtered && <ResetChip onClick={reset} />}
        </ChipRow>
      </div>

      {data.rows.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={filtered ? "কোনো ড্রাফট মেলেনি" : "এখনো কোনো ড্রাফট আসেনি"}
          hint={filtered ? "ফিল্টার বদলে বা রিসেট করে দেখুন" : "Vangcur checkout সংযুক্ত হলে এখানে ড্রাফট জমা হবে"}
        />
      ) : (
        <div className="lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-white/90 lg:bg-white lg:shadow-sh1">
          {/* মোবাইল/ট্যাবলেট কার্ড */}
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:hidden">
            {data.rows.map((r) => {
              const isOpen = expanded.has(r.id);
              const bucket = r.bucket ? BUCKET_META[r.bucket] : null;
              return (
                <article
                  key={r.id}
                  className="flex flex-col rounded-[20px] border border-white/90 bg-white p-3 shadow-sh1 transition-all duration-brand"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-body text-[13.5px] font-extrabold leading-snug text-ink">
                        {r.customer_name || "নাম নেই"}
                      </div>
                      <div className="mt-1 truncate font-body text-[11px] font-semibold text-muted">
                        {r.phone || r.phone_raw || "ফোন নেই"} · {timeAgoBn(r.last_activity_at)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-body text-[15px] font-black text-ink">{formatTaka(r.cart_total)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Pill tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</Pill>
                    {bucket && <Pill tone={bucket.tone}>{bucket.label}</Pill>}
                    {r.trust_score !== null && <Pill tone={trustTone(r.trust_score)} dot={false}>Trust {r.trust_score}</Pill>}
                    {r.do_not_contact && <Pill tone="red" dot={false}>DNC</Pill>}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border-base/60 pt-2.5">
                    <div className="min-w-0 truncate font-body text-[11.5px] font-semibold text-muted">{itemsSummary(r)}</div>
                    <button
                      type="button"
                      onClick={() => toggle(r.id)}
                      aria-expanded={isOpen}
                      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 font-body text-[12px] font-extrabold transition-all duration-brand active:scale-95 ${
                        isOpen ? "border-brand-light bg-brand-light text-white" : "border-brand-light/40 bg-brand-light/10 text-ink"
                      }`}
                    >
                      {isOpen ? "লুকান" : "সবকিছু দেখুন"}
                      <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={2.6} />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="animate-soft-fade-in mt-2.5 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <MiniTile label="জেলা" value={[r.district, r.upazila].filter(Boolean).join(", ") || "—"} />
                        <MiniTile label="প্রায়োরিটি" value={r.priority !== null ? String(r.priority) : "—"} />
                        <MiniTile label="UTM" value={r.utm_source || "—"} />
                        <MiniTile label="প্রথম দেখা" value={timeAgoBn(r.first_seen_at)} />
                      </div>
                      {r.address && <MiniTile label="ঠিকানা" value={r.address} />}
                      {(r.rule_flags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(r.rule_flags ?? []).map((f) => (
                            <Pill key={f} tone="amber" dot={false}>
                              {FLAG_LABELS[f] ?? f}
                            </Pill>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenId(r.id)}
                        className="h-11 w-full rounded-full bg-brand-light font-body text-[13px] font-black text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-[0.98]"
                      >
                        বিস্তারিত ও অ্যাকশন
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* ডেস্কটপ টেবিল */}
          <div className="hidden lg:block">
            <div className="sleek-scrollbar overflow-x-auto">
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="border-b border-border-base/60 bg-brand-bg/30 font-body text-[11px] font-extrabold uppercase tracking-wider text-muted">
                    <th className="px-4 py-3.5">গ্রাহক</th>
                    <th className="px-3 py-3.5">কার্ট</th>
                    <th className="px-3 py-3.5">ভ্যালু</th>
                    <th className="px-3 py-3.5">বাকেট</th>
                    <th className="px-3 py-3.5">Trust</th>
                    <th className="px-3 py-3.5">স্ট্যাটাস</th>
                    <th className="px-3 py-3.5">শেষ অ্যাক্টিভিটি</th>
                    <th className="px-3 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-base/40 font-body text-[13px]">
                  {data.rows.map((r) => {
                    const bucket = r.bucket ? BUCKET_META[r.bucket] : null;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setOpenId(r.id)}
                        className="cursor-pointer transition-colors duration-brand hover:bg-brand-bg/25"
                      >
                        <td className="px-4 py-3">
                          <div className="max-w-[220px] truncate font-extrabold text-ink">{r.customer_name || "নাম নেই"}</div>
                          <div className="text-[11.5px] font-semibold text-muted">
                            {r.phone || r.phone_raw || "ফোন নেই"}
                            {r.do_not_contact && <span className="ml-1.5 font-black text-danger">DNC</span>}
                          </div>
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-3 font-semibold text-ink">{itemsSummary(r)}</td>
                        <td className="px-3 py-3 font-black text-ink">{formatTaka(r.cart_total)}</td>
                        <td className="px-3 py-3">{bucket ? <Pill tone={bucket.tone}>{bucket.label}</Pill> : <span className="text-muted">—</span>}</td>
                        <td className="px-3 py-3">
                          {r.trust_score !== null ? <Pill tone={trustTone(r.trust_score)} dot={false}>{r.trust_score}</Pill> : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <Pill tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</Pill>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-muted">{timeAgoBn(r.last_activity_at)}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenId(r.id);
                            }}
                            aria-label="বিস্তারিত দেখুন"
                            title="বিস্তারিত দেখুন"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-95"
                          >
                            <Icon name="eye" className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 rounded-[20px] border border-white/90 bg-white p-3.5 shadow-sh1 lg:mt-0 lg:rounded-none lg:border-0 lg:border-t lg:border-border-base/60 lg:px-5 lg:shadow-none">
            <Pagination
              page={params.page}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={(p) => set({ page: p > 1 ? String(p) : null }, false)}
              bare
            />
          </div>
        </div>
      )}

      {openId && <DraftDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border-base/70 px-3 py-2">
      <div className="font-body text-[10px] font-extrabold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 break-words font-body text-[13px] font-extrabold leading-snug text-ink">{value}</div>
    </div>
  );
}
