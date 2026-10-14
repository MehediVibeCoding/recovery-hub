"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Pill from "../../components/common/Pill";
import Icon from "../../components/common/Icon";
import Switch from "../../components/common/Switch";
import StatTile from "../../components/common/StatTile";
import SectionHeading from "../../components/common/SectionHeading";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Field, FIELD_CLS } from "../../components/common/FormField";
import { useToast } from "../../components/common/Toast";
import { addDncContact, removeDncContact, saveAgentConfig } from "../actions/agent";
import { BUCKET_META } from "../../lib/labels";
import { formatDateBn, formatNumber, formatTaka, timeAgoBn } from "../../lib/format";
import type { AgentConfig, AgentPageData } from "../../lib/data/agent";

const STATE_UI = {
  none: { tone: "gray" as const, label: "সংযুক্ত নয়", note: "এখনো কোনো এজেন্ট কী নেই — Android gateway সংযোগ পরের ধাপে।" },
  online: { tone: "green" as const, label: "অনলাইন", note: "গত ৫ মিনিটের মধ্যে এজেন্ট সক্রিয় ছিল।" },
  offline: { tone: "red" as const, label: "অফলাইন", note: "গত ৫ মিনিটে এজেন্টের কোনো সাড়া নেই।" },
};

export default function AgentClient({ data }: { data: AgentPageData }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, startBusy] = useTransition();
  const [cfg, setCfg] = useState<AgentConfig>(data.config);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [dncError, setDncError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const ui = STATE_UI[data.state];
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data.config);

  function saveCfg() {
    setCfgError(null);
    startBusy(async () => {
      const res = await saveAgentConfig(cfg);
      if (res.ok) {
        showToast("✅ এজেন্ট কনফিগ সংরক্ষিত হয়েছে");
        router.refresh();
      } else setCfgError(res.error ?? "সেভ করা যায়নি");
    });
  }

  function addDnc() {
    setDncError(null);
    startBusy(async () => {
      const res = await addDncContact(phone, note);
      if (res.ok) {
        setPhone("");
        setNote("");
        showToast("✅ DNC তালিকায় যোগ হয়েছে");
        router.refresh();
      } else setDncError(res.error ?? "যোগ করা যায়নি");
    });
  }

  function removeDnc(p: string) {
    startBusy(async () => {
      const res = await removeDncContact(p);
      setConfirmRemove(null);
      if (res.ok) {
        showToast("✅ DNC থেকে সরানো হয়েছে");
        router.refresh();
      } else showToast("❌ " + (res.error ?? "ব্যর্থ"));
    });
  }

  return (
    <div className={`space-y-8 ${busy ? "opacity-80 transition-opacity" : "transition-opacity"}`}>
      {/* স্ট্যাটাস ব্যানার */}
      <div className="rounded-[24px] border border-white/90 bg-white p-4 shadow-sh1 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone={ui.tone}>{ui.label}</Pill>
          <span className="min-w-0 flex-1 font-body text-[12.5px] font-semibold text-muted">
            {ui.note}
            {data.lastSeen && ` শেষ সক্রিয়: ${timeAgoBn(data.lastSeen)}`}
          </span>
        </div>
        <p className="mt-3 rounded-2xl bg-[#FEF3C7] px-4 py-2.5 font-body text-[12px] font-bold leading-relaxed text-[#92400E]">
          এই পেজের কনফিগ ও কিউ এখনই কাজ করে, কিন্তু SMS পাঠানো শুরু হবে Android gateway সংযুক্ত হওয়ার পর।
          তার আগে “এজেন্ট চালু” করলেও কিছু পাঠানো হবে না।
        </p>
      </div>

      <section>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <StatTile icon="check" label="এখনই পাঠানোর যোগ্য" value={formatNumber(data.queue.eligibleNow)} sub={`${cfg.delay_minutes} মিনিট পার হয়েছে`} />
          <StatTile icon="clock" label="অপেক্ষমাণ" value={formatNumber(data.queue.waiting)} sub="ড্রাফট এখনো তাজা" />
          <StatTile icon="ban" label="DNC-তে বাদ" value={formatNumber(data.queue.excludedDnc)} sub="যোগাযোগ নিষিদ্ধ" />
          <StatTile icon="shield" label="DNC তালিকা" value={formatNumber(data.dncTotal)} sub="কন্টাক্ট নম্বর" />
        </div>
      </section>

      {/* কনফিগ */}
      <section>
        <SectionHeading hint="এজেন্ট কখন ও কতগুলো মেসেজ পাঠাবে তার নিয়ম">এজেন্ট কনফিগ</SectionHeading>
        <div className="space-y-4 rounded-[24px] border border-white/90 bg-white p-4 shadow-sh1 sm:p-5">
          <div className="flex items-center gap-3 rounded-2xl border border-border-base/80 bg-surface-muted/60 px-4 py-2">
            <div className="min-w-0 flex-1">
              <div className="font-body text-[13.5px] font-extrabold text-ink">এজেন্ট চালু</div>
              <div className="font-body text-[11.5px] font-medium text-muted">বন্ধ থাকলে কিউ থেকে কিছুই পাঠানো হবে না</div>
            </div>
            <Switch checked={cfg.enabled} label="এজেন্ট চালু" onChange={(v) => setCfg({ ...cfg, enabled: v })} />
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="অপেক্ষার সময় (মিনিট)" htmlFor="ag-delay" help="ড্রাফটের শেষ অ্যাক্টিভিটির এতক্ষণ পর মেসেজ যাবে (৫–১৪৪০)">
              <input
                id="ag-delay"
                type="number"
                inputMode="numeric"
                min={5}
                max={1440}
                className={FIELD_CLS}
                value={cfg.delay_minutes}
                onChange={(e) => setCfg({ ...cfg, delay_minutes: Number(e.target.value) })}
              />
            </Field>
            <Field label="দৈনিক সীমা (মেসেজ)" htmlFor="ag-cap" help="একদিনে সর্বোচ্চ কতগুলো (১–৫০০০)">
              <input
                id="ag-cap"
                type="number"
                inputMode="numeric"
                min={1}
                max={5000}
                className={FIELD_CLS}
                value={cfg.daily_cap}
                onChange={(e) => setCfg({ ...cfg, daily_cap: Number(e.target.value) })}
              />
            </Field>
            <Field label="কোয়াইট আওয়ার্স শুরু" htmlFor="ag-qs" help="ঢাকার সময়">
              <input id="ag-qs" type="time" className={FIELD_CLS} value={cfg.quiet_start} onChange={(e) => setCfg({ ...cfg, quiet_start: e.target.value })} />
            </Field>
            <Field label="কোয়াইট আওয়ার্স শেষ" htmlFor="ag-qe" help="এই সময়ে কোনো মেসেজ যাবে না">
              <input id="ag-qe" type="time" className={FIELD_CLS} value={cfg.quiet_end} onChange={(e) => setCfg({ ...cfg, quiet_end: e.target.value })} />
            </Field>
          </div>
          {cfgError && (
            <p role="alert" className="font-body text-[12.5px] font-bold text-danger">
              {cfgError}
            </p>
          )}
          <div className="flex justify-end gap-2.5">
            {dirty && (
              <button
                type="button"
                onClick={() => {
                  setCfg(data.config);
                  setCfgError(null);
                }}
                className="h-12 rounded-full bg-surface-muted px-5 font-body text-[13.5px] font-extrabold text-ink transition-all duration-brand hover:bg-border-base active:scale-[0.98]"
              >
                রিসেট
              </button>
            )}
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={saveCfg}
              className="h-12 rounded-full bg-brand-light px-7 font-body text-[14px] font-black text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? "সেভ হচ্ছে..." : "কনফিগ সেভ করুন"}
            </button>
          </div>
        </div>
      </section>

      {/* কিউ প্রিভিউ */}
      <section>
        <SectionHeading hint="High/Medium, Draft স্ট্যাটাস, DNC নয় — প্রায়োরিটি অনুযায়ী প্রথম ৮টি">পাঠানোর কিউ (প্রিভিউ)</SectionHeading>
        <div className="overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-sh1">
          {data.queue.preview.length === 0 ? (
            <p className="px-5 py-10 text-center font-body text-[13px] font-semibold text-muted">এই মুহূর্তে পাঠানোর যোগ্য কোনো ড্রাফট নেই।</p>
          ) : (
            <ul className="divide-y divide-border-base/40">
              {data.queue.preview.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-body text-[13.5px] font-extrabold text-ink">{r.customer_name || "নাম নেই"}</div>
                    <div className="truncate font-body text-[11px] font-semibold text-muted">
                      {r.phone} · {timeAgoBn(r.last_activity_at)}
                    </div>
                  </div>
                  {r.bucket && <Pill tone={BUCKET_META[r.bucket].tone}>{BUCKET_META[r.bucket].label}</Pill>}
                  <span className="w-20 shrink-0 text-right font-body text-[14px] font-black text-ink">{formatTaka(r.cart_total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* DNC */}
      <section>
        <SectionHeading hint="এই নম্বরে কখনো SMS যাবে না">Do-not-contact তালিকা</SectionHeading>
        <div className="space-y-3 rounded-[24px] border border-white/90 bg-white p-4 shadow-sh1 sm:p-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className={FIELD_CLS}
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              aria-label="মোবাইল নম্বর"
            />
            <input
              className={FIELD_CLS}
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="কারণ (ঐচ্ছিক)"
              aria-label="কারণ"
            />
            <button
              type="button"
              disabled={busy || !phone.trim()}
              onClick={addDnc}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand-light px-6 font-body text-[14px] font-black text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-[0.98] disabled:opacity-50"
            >
              <Icon name="plus" className="h-4 w-4" strokeWidth={2.8} />
              যোগ করুন
            </button>
          </div>
          {dncError && (
            <p role="alert" className="font-body text-[12.5px] font-bold text-danger">
              {dncError}
            </p>
          )}
          {data.dnc.length === 0 ? (
            <p className="py-6 text-center font-body text-[13px] font-semibold text-muted">DNC তালিকা খালি।</p>
          ) : (
            <ul className="divide-y divide-border-base/40 rounded-2xl border border-border-base/70">
              {data.dnc.map((c) => (
                <li key={c.phone} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-body text-[13.5px] font-extrabold tabular-nums text-ink">
                      {c.phone}
                      {c.name ? <span className="ml-2 font-semibold text-muted">{c.name}</span> : null}
                    </div>
                    <div className="truncate font-body text-[11px] font-semibold text-muted">
                      {c.opted_out_at ? formatDateBn(c.opted_out_at) : "—"}
                      {c.note ? ` · ${c.note}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(c.phone)}
                    aria-label={`${c.phone} DNC থেকে সরান`}
                    title="DNC থেকে সরান"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-red-200/80 bg-red-50 text-danger transition-all duration-brand active:scale-95 lg:h-9 lg:w-9"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {data.dncTotal > data.dnc.length && (
            <p className="font-body text-[11.5px] font-semibold text-muted">সর্বশেষ {data.dnc.length}টি দেখানো হচ্ছে — পুরোটা Export Center থেকে নামান।</p>
          )}
        </div>
      </section>

      {/* এজেন্ট কী */}
      <section>
        <SectionHeading hint="এজেন্ট কী বানানো/বন্ধ করা Settings → API কী থেকে">এজেন্ট কী</SectionHeading>
        <div className="overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-sh1">
          {data.keys.length === 0 ? (
            <p className="px-5 py-10 text-center font-body text-[13px] font-semibold text-muted">কোনো এজেন্ট কী নেই — Android gateway সংযোগের সময় বানানো হবে।</p>
          ) : (
            <ul className="divide-y divide-border-base/40">
              {data.keys.map((k) => (
                <li key={k.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-body text-[13.5px] font-extrabold text-ink">{k.name}</div>
                    <div className="truncate font-body text-[11px] font-semibold text-muted">
                      {k.key_prefix}… · শেষ ব্যবহার {k.last_used_at ? timeAgoBn(k.last_used_at) : "কখনো না"}
                    </div>
                  </div>
                  <Pill tone={k.is_active ? "green" : "gray"}>{k.is_active ? "সক্রিয়" : "বন্ধ"}</Pill>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {confirmRemove && (
        <ConfirmDialog
          tone="brand"
          title="DNC থেকে সরাবেন?"
          message={`${confirmRemove} আবার SMS পাওয়ার যোগ্য হবে। গ্রাহক নিজে অপ্ট-আউট করে থাকলে সরানো উচিত নয়।`}
          confirmLabel="সরান"
          busy={busy}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => removeDnc(confirmRemove)}
        />
      )}
    </div>
  );
}
