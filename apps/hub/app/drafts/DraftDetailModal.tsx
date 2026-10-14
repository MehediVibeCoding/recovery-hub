"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "../../components/common/Modal";
import Pill from "../../components/common/Pill";
import Icon from "../../components/common/Icon";
import Switch from "../../components/common/Switch";
import DetailTile from "../../components/common/DetailTile";
import SectionHeading from "../../components/common/SectionHeading";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { TEXTAREA_CLS } from "../../components/common/FormField";
import { useToast } from "../../components/common/Toast";
import { blockDraftPhone, loadDraftDetail, saveDraftNote, setDraftDnc, setDraftStatus } from "../actions/drafts";
import { BUCKET_META, FLAG_LABELS, STATUS_META } from "../../lib/labels";
import { formatDateTimeBn, formatTaka, timeAgoBn } from "../../lib/format";
import type { DraftDetail } from "../../lib/data/drafts";
import type { DraftStatus } from "../../lib/types";

const STATUS_ORDER: DraftStatus[] = ["draft", "contacted", "recovered", "lost", "invalid", "junk"];

const EVENT_LABELS: Record<string, string> = {
  created: "ড্রাফট তৈরি",
  updated: "ড্রাফট আপডেট (নতুন ইনপুট)",
  scored: "স্কোর হিসাব",
  status: "স্ট্যাটাস/ফ্ল্যাগ বদল",
  note: "নোট সংরক্ষণ",
  recovered: "রিকভার্ড",
};

function describeEvent(type: string, payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  if (type === "status") {
    if ("from" in payload || "to" in payload) return `${String(payload.from ?? "—")} → ${String(payload.to ?? "—")}`;
    if ("do_not_contact" in payload) return payload.do_not_contact ? "DNC চালু" : "DNC বন্ধ";
  }
  if ((type === "created" || type === "updated") && payload.bucket) {
    const flags = Array.isArray(payload.flags) ? (payload.flags as string[]).map((f) => FLAG_LABELS[f] ?? f).join(", ") : "";
    return `বাকেট: ${String(payload.bucket)}${flags ? ` · ${flags}` : ""}`;
  }
  return "";
}

export default function DraftDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<DraftDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, startBusy] = useTransition();
  const [confirmBlock, setConfirmBlock] = useState(false);

  const load = useCallback(async () => {
    const res = await loadDraftDetail(id);
    if (res.ok && res.data) {
      setDetail(res.data);
      setNote(res.data.draft.admin_note ?? "");
      setError(null);
    } else {
      setError(res.error ?? "লোড করা যায়নি");
    }
  }, [id]);

  useEffect(() => {
    setDetail(null);
    load();
  }, [load]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    startBusy(async () => {
      const res = await fn();
      if (res.ok) {
        showToast("✅ " + okMsg);
        await load();
        router.refresh();
      } else {
        showToast("❌ " + (res.error ?? "ব্যর্থ হয়েছে"));
      }
    });
  }

  const d = detail?.draft;
  const items = Array.isArray(d?.cart_items) ? d!.cart_items! : [];
  const trust = d?.trust_result;
  const bucket = d?.bucket ? BUCKET_META[d.bucket] : null;
  const noteChanged = (d?.admin_note ?? "") !== note.trim();

  return (
    <>
      <Modal
        eyebrow="ড্রাফট"
        title={d ? d.customer_name || "নাম নেই" : "লোড হচ্ছে..."}
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

        {detail && d && (
          <div className={`space-y-8 ${busy ? "opacity-70" : ""}`}>
            {/* স্ট্যাটাস */}
            <section>
              <SectionHeading hint="চাপলেই সাথে সাথে বদলে যাবে (ইতিহাসে লেখা থাকবে)">স্ট্যাটাস</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => {
                  const active = d.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={busy || active}
                      onClick={() => run(() => setDraftStatus(d.id, s), `স্ট্যাটাস: ${STATUS_META[s].label}`)}
                      aria-pressed={active}
                      className={`h-11 rounded-full border px-4 font-body text-[12.5px] font-extrabold transition-all duration-brand active:scale-95 disabled:opacity-100 lg:h-10 ${
                        active
                          ? "border-brand-light bg-brand-light text-white"
                          : "border-border-base/80 bg-white text-ink hover:border-brand-light hover:text-brand-light"
                      }`}
                    >
                      {STATUS_META[s].label}
                    </button>
                  );
                })}
              </div>
              {d.recovered_order_id && (
                <p className="mt-2.5 font-body text-[12px] font-semibold text-muted">
                  রিকভার্ড অর্ডার: <b className="font-black text-ink">{d.recovered_order_id}</b> · {formatDateTimeBn(d.recovered_at)}
                </p>
              )}
            </section>

            {/* গ্রাহক */}
            <section>
              <SectionHeading>গ্রাহকের তথ্য</SectionHeading>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <DetailTile label="নাম">{d.customer_name || "—"}</DetailTile>
                <div className="flex items-center gap-2 rounded-2xl border border-border-base/80 border-l-[3.5px] border-l-brand-light bg-surface-muted/60 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-body text-[10.5px] font-extrabold uppercase tracking-wider text-muted">ফোন</span>
                    <span className="mt-1 block break-words font-body text-[15px] font-extrabold tabular-nums text-ink">
                      {d.phone || d.phone_raw || "—"}
                    </span>
                  </span>
                  {d.phone && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(d.phone!);
                            showToast("✅ নম্বর কপি হয়েছে");
                          } catch {
                            showToast("❌ কপি করা যায়নি");
                          }
                        }}
                        aria-label="নম্বর কপি করুন"
                        title="নম্বর কপি করুন"
                        className="flex h-11 w-11 items-center justify-center rounded-full text-muted active:scale-95 lg:h-9 lg:w-9"
                      >
                        <Icon name="copy" className="h-4 w-4" />
                      </button>
                      <a
                        href={`tel:${d.phone}`}
                        aria-label="কল করুন"
                        title="কল করুন"
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-light/40 bg-brand-light/10 text-brand-light active:scale-95 lg:h-9 lg:w-9"
                      >
                        <Icon name="phone" className="h-4 w-4" />
                      </a>
                    </>
                  )}
                </div>
                <DetailTile label="ইমেইল">{d.email || "—"}</DetailTile>
                <DetailTile label="জেলা / উপজেলা">{[d.district, d.upazila].filter(Boolean).join(", ") || "—"}</DetailTile>
                <div className="sm:col-span-2">
                  <DetailTile label="ঠিকানা">{d.address || "—"}</DetailTile>
                </div>
                {d.notes && (
                  <div className="sm:col-span-2">
                    <DetailTile label="গ্রাহকের নোট">{d.notes}</DetailTile>
                  </div>
                )}
              </div>
            </section>

            {/* কার্ট */}
            <section>
              <SectionHeading hint={`শেষ অ্যাক্টিভিটি ${timeAgoBn(d.last_activity_at)}`}>কার্ট</SectionHeading>
              {items.length === 0 ? (
                <p className="font-body text-[13px] font-semibold text-muted">কার্টে কোনো আইটেম নেই।</p>
              ) : (
                <ul className="divide-y divide-border-base/50 overflow-hidden rounded-2xl border border-border-base/70">
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
                  <li className="flex items-center justify-between bg-brand-bg/30 px-4 py-3">
                    <span className="font-body text-[12px] font-extrabold uppercase tracking-wide text-muted">মোট</span>
                    <span className="font-body text-[16px] font-black text-ink">{formatTaka(d.cart_total)}</span>
                  </li>
                </ul>
              )}
            </section>

            {/* Trust */}
            <section>
              <SectionHeading hint="Trust Score Engine + Hub রুল লেয়ারের ফলাফল">Trust ও বাকেট</SectionHeading>
              <div className="flex flex-wrap items-center gap-2">
                {bucket && <Pill tone={bucket.tone}>{bucket.label}</Pill>}
                <Pill tone="blue" dot={false}>
                  স্কোর {d.trust_score ?? "—"}
                </Pill>
                <Pill tone="gray" dot={false}>
                  কনফিডেন্স {d.trust_confidence !== null ? Number(d.trust_confidence).toFixed(2) : "—"}
                </Pill>
                <Pill tone="gray" dot={false}>
                  প্রায়োরিটি {d.priority ?? "—"}
                </Pill>
                {(d.rule_flags ?? []).map((f) => (
                  <Pill key={f} tone="amber" dot={false}>
                    {FLAG_LABELS[f] ?? f}
                  </Pill>
                ))}
              </div>
              {trust?.factors && trust.factors.length > 0 && (
                <ul className="mt-3 divide-y divide-border-base/50 overflow-hidden rounded-2xl border border-border-base/70">
                  {trust.factors.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                      <span
                        className={`mt-0.5 w-10 shrink-0 text-right font-body text-[13px] font-black ${
                          f.points > 0 ? "text-success" : f.points < 0 ? "text-danger" : "text-muted"
                        }`}
                      >
                        {f.points > 0 ? `+${f.points}` : f.points}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-body text-[10.5px] font-extrabold uppercase tracking-wide text-muted">{f.module}</span>
                        <span className="block break-words font-body text-[12.5px] font-semibold text-ink">{f.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ইতিহাস */}
            <section>
              <SectionHeading hint="একই ফোন নম্বরের আগের ইতিহাস">কন্টাক্ট ইতিহাস</SectionHeading>
              {!d.phone ? (
                <p className="font-body text-[13px] font-semibold text-muted">বৈধ ফোন নম্বর নেই, তাই ইতিহাস নেই।</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <DetailTile label="ডেলিভারড">{detail.contact?.delivered_count ?? 0}</DetailTile>
                  <DetailTile label="রিটার্নড">{detail.contact?.returned_count ?? 0}</DetailTile>
                  <DetailTile label="ক্যানসেলড">{detail.contact?.cancelled_count ?? 0}</DetailTile>
                  <DetailTile label="ব্যাকআপ অর্ডার">{detail.orderCount}</DetailTile>
                  {detail.contact?.courier_total != null && (
                    <DetailTile label="কুরিয়ার সফল">
                      {detail.contact.courier_success ?? 0}/{detail.contact.courier_total}
                    </DetailTile>
                  )}
                </div>
              )}
            </section>

            {/* নোট */}
            <section>
              <SectionHeading>অ্যাডমিন নোট</SectionHeading>
              <textarea
                rows={3}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="কল করেছেন? কী বললেন? — এখানে লিখে রাখুন"
                className={TEXTAREA_CLS}
              />
              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  disabled={busy || !noteChanged}
                  onClick={() => run(() => saveDraftNote(d.id, note), "নোট সংরক্ষিত হয়েছে")}
                  className="h-11 rounded-full bg-brand-light px-6 font-body text-[13px] font-black text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-[0.98] disabled:opacity-50"
                >
                  নোট সেভ করুন
                </button>
              </div>
            </section>

            {/* নিরাপত্তা */}
            <section>
              <SectionHeading>যোগাযোগ নিয়ন্ত্রণ</SectionHeading>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 rounded-2xl border border-border-base/80 bg-surface-muted/60 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-body text-[13.5px] font-extrabold text-ink">Do-not-contact</div>
                    <div className="font-body text-[11.5px] font-medium text-muted">এই নম্বরে আর SMS যাবে না (ভবিষ্যৎ ড্রাফটেও)</div>
                  </div>
                  <Switch
                    checked={d.do_not_contact}
                    disabled={busy}
                    label="Do-not-contact"
                    onChange={(v) => run(() => setDraftDnc(d.id, v), v ? "DNC চালু হয়েছে" : "DNC বন্ধ হয়েছে")}
                  />
                </div>
                <button
                  type="button"
                  disabled={busy || !d.phone}
                  onClick={() => setConfirmBlock(true)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-red-200/80 bg-red-50 font-body text-[13px] font-extrabold text-danger transition-all duration-brand active:scale-[0.98] disabled:opacity-50"
                >
                  <Icon name="ban" className="h-4 w-4" />
                  নম্বর ব্লকলিস্টে তুলুন ও Junk করুন
                </button>
              </div>
            </section>

            {/* টাইমলাইন */}
            <section>
              <SectionHeading>টাইমলাইন</SectionHeading>
              {detail.events.length === 0 ? (
                <p className="font-body text-[13px] font-semibold text-muted">কোনো ইভেন্ট নেই।</p>
              ) : (
                <ol className="space-y-0">
                  {detail.events.map((ev) => (
                    <li key={ev.id} className="relative border-l-2 border-brand-light/30 pb-4 pl-4 last:pb-0">
                      <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-brand-light" />
                      <div className="font-body text-[13px] font-extrabold text-ink">{EVENT_LABELS[ev.type] ?? ev.type}</div>
                      {describeEvent(ev.type, ev.payload) && (
                        <div className="font-body text-[12px] font-medium text-muted">{describeEvent(ev.type, ev.payload)}</div>
                      )}
                      <div className="font-body text-[11px] font-semibold text-muted/80">
                        {ev.actor ?? "system"} · {formatDateTimeBn(ev.created_at)}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </Modal>

      {confirmBlock && d && (
        <ConfirmDialog
          title="নম্বর ব্লক করবেন?"
          message={`${d.phone} ব্লকলিস্টে যাবে এবং এই ড্রাফট Junk হবে। ভবিষ্যতে এই নম্বরের সব ড্রাফট Junk বাকেটে পড়বে। (Settings থেকে পরে সরানো যাবে)`}
          confirmLabel="ব্লক করুন"
          busy={busy}
          onCancel={() => setConfirmBlock(false)}
          onConfirm={() => {
            setConfirmBlock(false);
            run(() => blockDraftPhone(d.id), "নম্বর ব্লক হয়েছে");
          }}
        />
      )}
    </>
  );
}
