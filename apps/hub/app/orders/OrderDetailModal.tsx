"use client";

import { useEffect, useState } from "react";
import Modal from "../../components/common/Modal";
import Pill from "../../components/common/Pill";
import DetailTile from "../../components/common/DetailTile";
import SectionHeading from "../../components/common/SectionHeading";
import { loadOrderDetail } from "../actions/orders";
import { orderStatusTone, paymentTone } from "../../lib/labels";
import { formatDateTimeBn, formatTaka } from "../../lib/format";
import type { OrderDetail } from "../../lib/data/orders";

export default function OrderDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let alive = true;
    setDetail(null);
    loadOrderDetail(id).then((res) => {
      if (!alive) return;
      if (res.ok && res.data) setDetail(res.data);
      else setError(res.error ?? "লোড করা যায়নি");
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const o = detail?.order;
  const items = Array.isArray(o?.items) ? o!.items! : [];

  return (
    <Modal
      eyebrow="অর্ডার ব্যাকআপ"
      title={o ? `#${o.external_order_id}` : "লোড হচ্ছে..."}
      onClose={onClose}
      escToClose
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-12 w-full rounded-full bg-surface-muted font-body text-[13.5px] font-extrabold text-ink transition-all duration-brand hover:bg-border-base active:scale-[0.98]"
        >
          বন্ধ করুন
        </button>
      }
    >
      {error && (
        <div role="alert" className="rounded-2xl border border-red-200/80 bg-red-50 p-4 font-body text-[13px] font-semibold text-danger">
          {error}
        </div>
      )}
      {!detail && !error && (
        <div className="animate-pulse space-y-3" aria-busy="true">
          <div className="h-14 rounded-2xl bg-surface-muted" />
          <div className="h-14 rounded-2xl bg-surface-muted" />
          <div className="h-32 rounded-2xl bg-surface-muted" />
        </div>
      )}
      {o && detail && (
        <div className="space-y-8">
          <section>
            <div className="flex flex-wrap items-center gap-2">
              {o.order_status && <Pill tone={orderStatusTone(o.order_status)}>{o.order_status}</Pill>}
              {o.payment_status && (
                <Pill tone={paymentTone(o.payment_status)} dot={false}>
                  পেমেন্ট: {o.payment_status}
                </Pill>
              )}
              {detail.recoveredDraft && (
                <Pill tone="green" dot={false}>
                  Recovery Hub থেকে রিকভার্ড
                </Pill>
              )}
            </div>
            <p className="mt-2 font-body text-[12px] font-semibold text-muted">
              অর্ডারের সময় {formatDateTimeBn(o.order_created_at ?? o.created_at)} · ব্যাকআপ {formatDateTimeBn(o.created_at)}
            </p>
          </section>

          <section>
            <SectionHeading>গ্রাহকের তথ্য</SectionHeading>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <DetailTile label="নাম">{o.customer_name || "—"}</DetailTile>
              <DetailTile label="ফোন" mono>
                {o.phone || "—"}
              </DetailTile>
              <DetailTile label="ইমেইল">{o.email || "—"}</DetailTile>
              <DetailTile label="জেলা">{o.district || "—"}</DetailTile>
              <div className="sm:col-span-2">
                <DetailTile label="ঠিকানা">{o.address || "—"}</DetailTile>
              </div>
            </div>
          </section>

          <section>
            <SectionHeading>আইটেম ও টাকা</SectionHeading>
            {items.length === 0 ? (
              <p className="font-body text-[13px] font-semibold text-muted">আইটেমের তথ্য নেই।</p>
            ) : (
              <ul className="mb-3 divide-y divide-border-base/50 overflow-hidden rounded-2xl border border-border-base/70">
                {items.map((it, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="break-words font-body text-[13.5px] font-extrabold text-ink">{it.name || "আইটেম"}</div>
                      <div className="font-body text-[11px] font-semibold text-muted">
                        {it.sku ? `${it.sku} · ` : ""}
                        {formatTaka(it.price)} × {it.qty ?? 1}
                      </div>
                    </div>
                    <div className="shrink-0 font-body text-[14px] font-black text-ink">
                      {formatTaka((Number(it.price) || 0) * (Number(it.qty) || 1))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <DetailTile label="সাবটোটাল">{o.subtotal != null ? formatTaka(o.subtotal) : "—"}</DetailTile>
              <DetailTile label="শিপিং">{o.shipping != null ? formatTaka(o.shipping) : "—"}</DetailTile>
              <DetailTile label="ডিসকাউন্ট">{o.discount != null ? formatTaka(o.discount) : "—"}</DetailTile>
              <DetailTile label="মোট">{formatTaka(o.total)}</DetailTile>
            </div>
            <div className="mt-2.5">
              <DetailTile label="পেমেন্ট মাধ্যম">{o.payment_method || "—"}</DetailTile>
            </div>
          </section>

          {detail.recoveredDraft && (
            <section>
              <SectionHeading>রিকভারি</SectionHeading>
              <p className="font-body text-[13px] font-semibold text-ink">
                এই অর্ডারটি একটি অ্যাবান্ডনড ড্রাফট থেকে রিকভার্ড হয়েছে
                {detail.recoveredDraft.recovered_at ? ` (${formatDateTimeBn(detail.recoveredDraft.recovered_at)})` : ""}।
              </p>
            </section>
          )}

          <section>
            <SectionHeading hint="স্টোর থেকে আসা মূল ডাটা">Raw payload</SectionHeading>
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="h-11 rounded-full border border-brand-light/40 bg-brand-light/10 px-4 font-body text-[12.5px] font-extrabold text-ink transition-all duration-brand active:scale-95"
            >
              {showRaw ? "লুকান" : "দেখুন"}
            </button>
            {showRaw && (
              <pre className="sleek-scrollbar animate-soft-fade-in mt-3 max-h-80 overflow-auto rounded-2xl bg-surface-muted p-4 font-mono text-[11.5px] leading-relaxed text-ink">
                {JSON.stringify(o.raw_payload ?? {}, null, 2)}
              </pre>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
