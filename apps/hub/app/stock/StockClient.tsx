"use client";

import { useState, useTransition } from "react";
import Pagination from "../../components/common/Pagination";
import Pill from "../../components/common/Pill";
import Icon from "../../components/common/Icon";
import EmptyState from "../../components/common/EmptyState";
import StatTile from "../../components/common/StatTile";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/Toast";
import { Chip, ChipRow, ResetChip, SearchBox } from "../../components/common/Toolbar";
import { useQueryNav } from "../../components/common/useQueryNav";
import { timeAgoBn, formatDateTimeBn } from "../../lib/format";
import { deleteStockRequest, markProductNotified, setStockRequestStatus } from "../actions/stock";
import type { StockFilter, StockPage, StockParams } from "../../lib/data/stock";
import type { StockRequestRow } from "../../lib/types";

const CHIPS: { key: StockFilter; label: string }[] = [
  { key: "ready", label: "স্টকে ফিরেছে — জানাতে হবে" },
  { key: "waiting", label: "অপেক্ষায়" },
  { key: "notified", label: "জানানো হয়েছে" },
  { key: "cancelled", label: "বাতিল" },
  { key: "all", label: "সব" },
];

function statusPill(r: StockRequestRow) {
  if (r.status === "notified") return <Pill tone="green">জানানো হয়েছে</Pill>;
  if (r.status === "cancelled") return <Pill tone="gray">বাতিল</Pill>;
  if (r.restocked_at) return <Pill tone="blue">স্টকে ফিরেছে</Pill>;
  return <Pill tone="amber">অপেক্ষায়</Pill>;
}

export default function StockClient({ data, params }: { data: StockPage; params: StockParams }) {
  const current: Record<string, string> = {};
  if (params.status !== "ready") current.status = params.status;
  if (params.q) current.q = params.q;
  if (params.page > 1) current.page = String(params.page);

  const { set, reset, pending } = useQueryNav(current);
  const { showToast } = useToast();
  const [busy, startBusy] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<StockRequestRow | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<{ id: string; name: string; count: number } | null>(null);

  const filtered = params.status !== "ready" || params.q !== "";

  function changeStatus(r: StockRequestRow, status: "pending" | "notified" | "cancelled", okMsg: string) {
    startBusy(async () => {
      const res = await setStockRequestStatus(r.id, status);
      showToast(res.ok ? okMsg : res.error || "ব্যর্থ হয়েছে");
    });
  }

  function doBulk() {
    if (!confirmBulk) return;
    const target = confirmBulk;
    setConfirmBulk(null);
    startBusy(async () => {
      const res = await markProductNotified(target.id);
      showToast(res.ok ? `${res.data?.count ?? 0} জনকে জানানো হয়েছে হিসেবে চিহ্নিত হলো` : res.error || "ব্যর্থ হয়েছে");
    });
  }

  function doDelete() {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    startBusy(async () => {
      const res = await deleteStockRequest(target.id);
      showToast(res.ok ? "রিকোয়েস্ট মুছে ফেলা হয়েছে" : res.error || "ব্যর্থ হয়েছে");
    });
  }

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      showToast("নম্বর কপি হয়েছে");
    } catch {
      showToast("কপি করা যায়নি");
    }
  }

  function Actions({ r }: { r: StockRequestRow }) {
    const btn =
      "flex h-11 items-center justify-center gap-1.5 rounded-full border px-3.5 font-body text-[12px] font-extrabold transition-all duration-brand active:scale-95 disabled:opacity-50 lg:h-9";
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <a href={`tel:${r.phone}`} className={`${btn} border-brand-light/40 bg-brand-light/10 text-ink`} onClick={(e) => e.stopPropagation()}>
          <Icon name="phone" className="h-3.5 w-3.5" /> কল
        </a>
        <button type="button" onClick={() => copyPhone(r.phone)} className={`${btn} border-border-base/80 bg-white text-ink`}>
          <Icon name="copy" className="h-3.5 w-3.5" /> কপি
        </button>
        {r.status !== "notified" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => changeStatus(r, "notified", "জানানো হয়েছে হিসেবে চিহ্নিত")}
            className={`${btn} border-brand-light bg-brand-light text-white`}
          >
            <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} /> জানানো হয়েছে
          </button>
        )}
        {r.status !== "cancelled" && r.status !== "notified" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => changeStatus(r, "cancelled", "বাতিল করা হয়েছে")}
            className={`${btn} border-border-base/80 bg-white text-muted`}
          >
            বাতিল
          </button>
        )}
        {r.status !== "pending" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => changeStatus(r, "pending", "আবার অপেক্ষায় রাখা হয়েছে")}
            className={`${btn} border-border-base/80 bg-white text-muted`}
          >
            আবার অপেক্ষায়
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmDelete(r)}
          aria-label="মুছুন"
          className={`${btn} border-red-200/80 bg-red-50 text-danger`}
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={pending || busy ? "opacity-70 transition-opacity" : "transition-opacity"}>
      <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatTile label="জানাতে হবে" value={data.counts.ready} sub="স্টকে ফিরেছে, এখনো জানানো হয়নি" icon="bell" />
        <StatTile label="অপেক্ষায়" value={data.counts.waiting} sub="প্রোডাক্ট এখনো স্টকে আসেনি" icon="clock" />
        <StatTile label="জানানো হয়েছে" value={data.counts.notified} icon="check" />
        <StatTile label="আলাদা প্রোডাক্ট" value={data.distinctProducts} sub="যেগুলোর রিকোয়েস্ট খোলা আছে" icon="box" />
      </div>

      {data.readyProducts.length > 0 && (
        <div className="mb-4 rounded-[24px] border border-brand-light/30 bg-brand-light/10 p-3.5 sm:p-4">
          <div className="mb-2.5 font-body text-[13px] font-black text-ink">এই প্রোডাক্টগুলো স্টকে ফিরেছে — গ্রাহকদের জানান</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {data.readyProducts.map((p) => (
              <div key={p.product_id} className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-sh1">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-body text-[13px] font-extrabold text-ink">{p.product_name}</div>
                  <div className="font-body text-[11px] font-semibold text-muted">
                    {p.count} জন অপেক্ষায়{p.stock !== null ? ` · স্টক ${p.stock}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmBulk({ id: p.product_id, name: p.product_name, count: p.count })}
                  className="h-11 shrink-0 rounded-full border border-brand-light bg-brand-light px-3.5 font-body text-[11.5px] font-black text-white transition-all duration-brand active:scale-95 disabled:opacity-50 lg:h-9"
                >
                  সবাইকে জানানো হয়েছে
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 rounded-[24px] border border-white/90 bg-white p-3.5 shadow-sh1 sm:p-4">
        <SearchBox value={params.q} onSearch={(q) => set({ q })} placeholder="নাম, ফোন বা প্রোডাক্ট দিয়ে খুঁজুন..." />
        <ChipRow>
          {CHIPS.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              count={data.counts[c.key]}
              active={params.status === c.key}
              onClick={() => set({ status: c.key === "ready" ? null : c.key })}
            />
          ))}
          {filtered && <ResetChip onClick={reset} />}
        </ChipRow>
      </div>

      {data.rows.length === 0 ? (
        <EmptyState
          icon="bell"
          title={filtered ? "কোনো রিকোয়েস্ট মেলেনি" : "এখন জানানোর মতো কিছু নেই"}
          hint={
            filtered
              ? "ফিল্টার বদলে বা রিসেট করে দেখুন"
              : "অ্যাডমিন প্যানেলে কোনো প্রোডাক্টের স্টক ০ থেকে বাড়লে, সেটার অপেক্ষমাণ রিকোয়েস্ট এখানে আসবে"
          }
        />
      ) : (
        <div className="lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-white/90 lg:bg-white lg:shadow-sh1">
          {/* মোবাইল/ট্যাবলেট কার্ড */}
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:hidden">
            {data.rows.map((r) => (
              <article key={r.id} className="flex flex-col gap-2.5 rounded-[20px] border border-white/90 bg-white p-3 shadow-sh1">
                <div className="flex items-start gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 font-body text-[13.5px] font-extrabold leading-snug text-ink">
                      {r.product_name || `প্রোডাক্ট #${r.product_id}`}
                    </div>
                    <div className="mt-1 truncate font-body text-[11.5px] font-semibold text-muted">
                      {r.customer_name || "নাম নেই"} · {r.phone}
                    </div>
                  </div>
                  <div className="shrink-0">{statusPill(r)}</div>
                </div>
                <div className="font-body text-[11px] font-semibold text-muted">
                  রিকোয়েস্ট: {timeAgoBn(r.created_at)}
                  {r.restocked_at ? ` · স্টকে ফিরেছে: ${timeAgoBn(r.restocked_at)}` : ""}
                  {r.notified_at ? ` · জানানো: ${timeAgoBn(r.notified_at)}` : ""}
                </div>
                <Actions r={r} />
              </article>
            ))}
          </div>

          {/* ডেস্কটপ টেবিল */}
          <div className="hidden lg:block">
            <div className="sleek-scrollbar overflow-x-auto">
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="border-b border-border-base/60 bg-brand-bg/30 font-body text-[11px] font-extrabold uppercase tracking-wider text-muted">
                    <th className="px-4 py-3.5">প্রোডাক্ট</th>
                    <th className="px-3 py-3.5">গ্রাহক</th>
                    <th className="px-3 py-3.5">স্ট্যাটাস</th>
                    <th className="px-3 py-3.5">রিকোয়েস্ট</th>
                    <th className="px-3 py-3.5">স্টকে ফিরেছে</th>
                    <th className="px-3 py-3.5">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-base/40 font-body text-[13px]">
                  {data.rows.map((r) => (
                    <tr key={r.id} className="transition-colors duration-brand hover:bg-brand-bg/25">
                      <td className="px-4 py-3">
                        <div className="max-w-[260px] truncate font-extrabold text-ink">{r.product_name || `প্রোডাক্ট #${r.product_id}`}</div>
                        <div className="text-[11px] font-semibold text-muted">ID: {r.product_id}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="max-w-[180px] truncate font-extrabold text-ink">{r.customer_name || "নাম নেই"}</div>
                        <div className="text-[11.5px] font-semibold text-muted">{r.phone}</div>
                      </td>
                      <td className="px-3 py-3">{statusPill(r)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-muted" title={formatDateTimeBn(r.created_at)}>
                        {timeAgoBn(r.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-muted" title={formatDateTimeBn(r.restocked_at)}>
                        {r.restocked_at ? `${timeAgoBn(r.restocked_at)}${r.restocked_stock !== null ? ` (স্টক ${r.restocked_stock})` : ""}` : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Actions r={r} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 lg:mt-0">
            <Pagination page={params.page} total={data.total} pageSize={data.pageSize} onPageChange={(p) => set({ page: String(p) }, false)} bare />
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="রিকোয়েস্ট মুছবেন?"
          message={`${confirmDelete.customer_name || confirmDelete.phone}-এর এই রিকোয়েস্ট স্থায়ীভাবে মুছে যাবে।`}
          confirmLabel="হ্যাঁ, মুছুন"
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmBulk && (
        <ConfirmDialog
          tone="brand"
          title="সবাইকে জানানো হয়েছে চিহ্নিত করবেন?"
          message={`"${confirmBulk.name}"-এর ${confirmBulk.count} জন অপেক্ষমাণ গ্রাহককে "জানানো হয়েছে" হিসেবে চিহ্নিত হবে। এটা শুধু হিসাব রাখে, SMS যায় না।`}
          confirmLabel="হ্যাঁ, চিহ্নিত করুন"
          onConfirm={doBulk}
          onCancel={() => setConfirmBulk(null)}
        />
      )}
    </div>
  );
}
