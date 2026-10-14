"use client";

import { useState } from "react";
import Pagination from "../../components/common/Pagination";
import Pill from "../../components/common/Pill";
import Icon from "../../components/common/Icon";
import EmptyState from "../../components/common/EmptyState";
import { Chip, ChipRow, DateInput, ResetChip, SearchBox } from "../../components/common/Toolbar";
import { useQueryNav } from "../../components/common/useQueryNav";
import OrderDetailModal from "./OrderDetailModal";
import { orderStatusTone, paymentTone } from "../../lib/labels";
import { formatDateBn, formatNumber, formatTaka } from "../../lib/format";
import type { OrdersPage, OrdersParams } from "../../lib/data/orders";

export default function OrdersClient({ data, params }: { data: OrdersPage; params: OrdersParams }) {
  const current: Record<string, string> = {};
  if (params.status !== "all") current.status = params.status;
  if (params.q) current.q = params.q;
  if (params.from) current.from = params.from;
  if (params.to) current.to = params.to;
  if (params.page > 1) current.page = String(params.page);

  const { set, reset, pending } = useQueryNav(current);
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = params.status !== "all" || params.q !== "" || params.from !== "" || params.to !== "";
  const allCount = data.statusCounts.reduce((a, s) => a + s.count, 0);
  const avg = data.total > 0 ? data.grandTotal / Math.min(data.total, data.grandCapped ? 5000 : data.total) : 0;

  return (
    <div className={pending ? "opacity-70 transition-opacity" : "transition-opacity"}>
      <div className="mb-4 rounded-[24px] border border-white/90 bg-white p-3.5 shadow-sh1 sm:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <SearchBox
            value={params.q}
            onSearch={(q) => set({ q })}
            placeholder="অর্ডার আইডি, নাম বা ফোন দিয়ে খুঁজুন..."
          />
          <div className="flex gap-2.5">
            <DateInput label="থেকে" value={params.from} onChange={(v) => set({ from: v || null })} />
            <DateInput label="পর্যন্ত" value={params.to} onChange={(v) => set({ to: v || null })} />
          </div>
        </div>
        <ChipRow>
          <Chip label="সব" count={allCount} active={params.status === "all"} onClick={() => set({ status: null })} />
          {data.statusCounts.map((s) => (
            <Chip
              key={s.status}
              label={s.status === "__none" ? "স্ট্যাটাস নেই" : s.status}
              count={s.count}
              active={params.status === s.status}
              onClick={() => set({ status: s.status })}
            />
          ))}
          {filtered && <ResetChip onClick={reset} />}
        </ChipRow>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2.5">
        <SummaryTile label="অর্ডার" value={formatNumber(data.total)} />
        <SummaryTile label="মোট টাকা" value={formatTaka(data.grandTotal)} />
        <SummaryTile label="গড় অর্ডার" value={formatTaka(avg)} />
      </div>
      {data.grandCapped && (
        <p className="mb-3 font-body text-[11px] font-semibold text-muted">
          মোট টাকা/গড় প্রথম ৫,০০০টি অর্ডারের ভিত্তিতে হিসাব করা।
        </p>
      )}

      {data.rows.length === 0 ? (
        <EmptyState
          icon="box"
          title={filtered ? "কোনো অর্ডার মেলেনি" : "এখনো কোনো অর্ডার ব্যাকআপ হয়নি"}
          hint={filtered ? "ফিল্টার বদলে বা রিসেট করে দেখুন" : "Vangcur থেকে অর্ডার সংযুক্ত হলে এখানে জমা হবে"}
        />
      ) : (
        <div className="lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-white/90 lg:bg-white lg:shadow-sh1">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:hidden">
            {data.rows.map((o) => (
              <article key={o.id} className="flex flex-col rounded-[20px] border border-white/90 bg-white p-3 shadow-sh1">
                <div className="flex items-start gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-body text-[13.5px] font-extrabold text-ink">#{o.external_order_id}</div>
                    <div className="mt-0.5 truncate font-body text-[11.5px] font-semibold text-muted">
                      {o.customer_name || "নাম নেই"} · {o.phone || "ফোন নেই"}
                    </div>
                  </div>
                  <div className="shrink-0 font-body text-[15px] font-black text-ink">{formatTaka(o.total)}</div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {o.order_status && <Pill tone={orderStatusTone(o.order_status)}>{o.order_status}</Pill>}
                  {o.payment_status && (
                    <Pill tone={paymentTone(o.payment_status)} dot={false}>
                      {o.payment_status}
                    </Pill>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border-base/60 pt-2.5">
                  <span className="min-w-0 truncate font-body text-[11.5px] font-semibold text-muted">
                    {formatDateBn(o.order_created_at ?? o.created_at)}
                    {o.district ? ` · ${o.district}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenId(o.id)}
                    className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-brand-light/40 bg-brand-light/10 px-4 font-body text-[12px] font-extrabold text-ink transition-all duration-brand active:scale-95"
                  >
                    বিস্তারিত
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden lg:block">
            <div className="sleek-scrollbar overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-border-base/60 bg-brand-bg/30 font-body text-[11px] font-extrabold uppercase tracking-wider text-muted">
                    <th className="px-4 py-3.5">অর্ডার</th>
                    <th className="px-3 py-3.5">গ্রাহক</th>
                    <th className="px-3 py-3.5">জেলা</th>
                    <th className="px-3 py-3.5">মোট</th>
                    <th className="px-3 py-3.5">পেমেন্ট</th>
                    <th className="px-3 py-3.5">স্ট্যাটাস</th>
                    <th className="px-3 py-3.5">তারিখ</th>
                    <th className="px-3 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-base/40 font-body text-[13px]">
                  {data.rows.map((o) => (
                    <tr key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer transition-colors duration-brand hover:bg-brand-bg/25">
                      <td className="px-4 py-3 font-extrabold text-ink">#{o.external_order_id}</td>
                      <td className="px-3 py-3">
                        <div className="max-w-[200px] truncate font-extrabold text-ink">{o.customer_name || "নাম নেই"}</div>
                        <div className="text-[11.5px] font-semibold text-muted">{o.phone || "—"}</div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-ink">{o.district || "—"}</td>
                      <td className="px-3 py-3 font-black text-ink">{formatTaka(o.total)}</td>
                      <td className="px-3 py-3">
                        <div className="text-[12px] font-semibold text-ink">{o.payment_method || "—"}</div>
                        {o.payment_status && (
                          <Pill tone={paymentTone(o.payment_status)} dot={false} className="mt-1">
                            {o.payment_status}
                          </Pill>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {o.order_status ? <Pill tone={orderStatusTone(o.order_status)}>{o.order_status}</Pill> : <span className="text-muted">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-muted">{formatDateBn(o.order_created_at ?? o.created_at)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(o.id);
                          }}
                          aria-label="বিস্তারিত দেখুন"
                          title="বিস্তারিত দেখুন"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-95"
                        >
                          <Icon name="eye" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {openId && <OrderDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[20px] border border-white/90 bg-white p-3 shadow-sh1">
      <div className="font-body text-[10px] font-extrabold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 truncate font-body text-[17px] font-black text-ink">{value}</div>
    </div>
  );
}
