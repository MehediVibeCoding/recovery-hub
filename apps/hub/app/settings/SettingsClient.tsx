"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Pill from "../../components/common/Pill";
import Icon from "../../components/common/Icon";
import Switch from "../../components/common/Switch";
import SectionHeading from "../../components/common/SectionHeading";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Field, FIELD_CLS, SelectBox } from "../../components/common/FormField";
import { useToast } from "../../components/common/Toast";
import {
  addListEntry,
  removeListEntry,
  saveRule,
  saveStoreSettings,
  saveWeights,
  setApiKeyActive,
} from "../actions/settings";
import { RULE_DEFS } from "../../lib/rules";
import { auditLabel } from "../../lib/labels";
import { formatDateTimeBn, timeAgoBn } from "../../lib/format";
import type { ApiKeyRow, ListEntryRow, RuleRow, SettingsPageData } from "../../lib/data/settings";

const CARD = "rounded-[24px] border border-white/90 bg-white p-4 shadow-sh1 sm:p-5";
const SAVE_BTN =
  "h-12 rounded-full bg-brand-light px-7 font-body text-[14px] font-black text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-[0.98] disabled:opacity-50";

type Run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string, onErr?: (m: string) => void) => void;

function RuleCard({ rule, run, busy }: { rule: RuleRow; run: Run; busy: boolean }) {
  const def = RULE_DEFS[rule.key];
  const [enabled, setEnabled] = useState(rule.enabled);
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries((def?.fields ?? []).map((f) => [f.key, String(rule.params[f.key] ?? "")]))
  );
  const [err, setErr] = useState<string | null>(null);
  const dirty =
    enabled !== rule.enabled || (def?.fields ?? []).some((f) => String(rule.params[f.key] ?? "") !== vals[f.key]);

  return (
    <div className="rounded-2xl border border-border-base/80 bg-surface-muted/40 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-body text-[14px] font-extrabold text-ink">{def?.title ?? rule.key}</div>
          {rule.description && <div className="mt-0.5 font-body text-[11.5px] font-medium text-muted">{rule.description}</div>}
        </div>
        <Switch checked={enabled} label={`${def?.title ?? rule.key} চালু/বন্ধ`} onChange={setEnabled} disabled={!def} />
      </div>
      {def ? (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {def.fields.map((f) => (
              <Field key={f.key} label={f.label} help={f.help} htmlFor={`${rule.key}-${f.key}`}>
                <input
                  id={`${rule.key}-${f.key}`}
                  type="number"
                  inputMode="decimal"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  className={FIELD_CLS}
                  value={vals[f.key]}
                  onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
          {err && (
            <p role="alert" className="mt-2 font-body text-[12.5px] font-bold text-danger">
              {err}
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => {
                setErr(null);
                run(() => saveRule(rule.key, enabled, vals), "রুল সংরক্ষিত হয়েছে", setErr);
              }}
              className={SAVE_BTN}
            >
              রুল সেভ করুন
            </button>
          </div>
        </>
      ) : (
        <p className="mt-2 font-body text-[12px] font-semibold text-muted">এই রুলের এডিটর নেই।</p>
      )}
    </div>
  );
}

export default function SettingsClient({ data }: { data: SettingsPageData }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, startBusy] = useTransition();

  const run: Run = (fn, okMsg, onErr) => {
    startBusy(async () => {
      const res = await fn();
      if (res.ok) {
        showToast("✅ " + okMsg);
        router.refresh();
      } else {
        showToast("❌ " + (res.error ?? "ব্যর্থ হয়েছে"));
        onErr?.(res.error ?? "ব্যর্থ হয়েছে");
      }
    });
  };

  // priority weights
  const [w, setW] = useState({
    trust: String(data.weights.trust),
    value: String(data.weights.value),
    freshness: String(data.weights.freshness),
    confidence: String(data.weights.confidence),
    high: String(data.weights.bucketBase.high),
    medium: String(data.weights.bucketBase.medium),
  });
  const [wErr, setWErr] = useState<string | null>(null);
  const wSum = ["trust", "value", "freshness", "confidence"].reduce((a, k) => a + (Number(w[k as keyof typeof w]) || 0), 0);

  // store
  const [storeName, setStoreName] = useState(data.storeName);
  const [locale, setLocale] = useState<string>(data.locale);
  const [sErr, setSErr] = useState<string | null>(null);

  // list entries
  const [tab, setTab] = useState<"block" | "allow">("block");
  const [kind, setKind] = useState("phone");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [lErr, setLErr] = useState<string | null>(null);
  const [delEntry, setDelEntry] = useState<ListEntryRow | null>(null);
  const [keyToggle, setKeyToggle] = useState<ApiKeyRow | null>(null);

  const shown = data.entries.filter((e) => e.list === tab);

  return (
    <div className={`space-y-10 ${busy ? "opacity-80 transition-opacity" : "transition-opacity"}`}>
      {/* রুল */}
      <section>
        <SectionHeading hint="নতুন ড্রাফট স্কোর হওয়ার সময় এই রুল কাজ করে (আগের ড্রাফটের বাকেট বদলায় না)">স্কোরিং রুল</SectionHeading>
        <div className={`${CARD} space-y-3`}>
          {data.rules.length === 0 ? (
            <p className="py-6 text-center font-body text-[13px] font-semibold text-muted">কোনো রুল নেই।</p>
          ) : (
            data.rules.map((r) => <RuleCard key={r.id + r.updated_at} rule={r} run={run} busy={busy} />)
          )}
        </div>
      </section>

      {/* ওয়েট */}
      <section>
        <SectionHeading hint="প্রায়োরিটি = বাকেট বেস + ওয়েটেড (Trust, Value, Freshness, Confidence)">প্রায়োরিটি ওয়েট</SectionHeading>
        <div className={`${CARD} space-y-4`}>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {(
              [
                ["trust", "Trust"],
                ["value", "Value"],
                ["freshness", "Freshness"],
                ["confidence", "Confidence"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label} htmlFor={`w-${k}`}>
                <input id={`w-${k}`} type="number" inputMode="decimal" step={0.05} min={0} max={1} className={FIELD_CLS} value={w[k]} onChange={(e) => setW({ ...w, [k]: e.target.value })} />
              </Field>
            ))}
            <Field label="High বেস" htmlFor="w-high">
              <input id="w-high" type="number" inputMode="decimal" min={0} max={1000} className={FIELD_CLS} value={w.high} onChange={(e) => setW({ ...w, high: e.target.value })} />
            </Field>
            <Field label="Medium বেস" htmlFor="w-medium">
              <input id="w-medium" type="number" inputMode="decimal" min={0} max={1000} className={FIELD_CLS} value={w.medium} onChange={(e) => setW({ ...w, medium: e.target.value })} />
            </Field>
          </div>
          <p className={`font-body text-[12px] font-bold ${Math.abs(wSum - 1) < 0.001 ? "text-muted" : "text-[#92400E]"}`}>
            চারটি ওয়েটের যোগফল: {wSum.toFixed(2)} {Math.abs(wSum - 1) < 0.001 ? "" : "(সাধারণত ১.০০ রাখা হয়)"}
          </p>
          {wErr && (
            <p role="alert" className="font-body text-[12.5px] font-bold text-danger">
              {wErr}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy}
              className={SAVE_BTN}
              onClick={() => {
                setWErr(null);
                run(
                  () =>
                    saveWeights({
                      trust: Number(w.trust),
                      value: Number(w.value),
                      freshness: Number(w.freshness),
                      confidence: Number(w.confidence),
                      bucketBase: { high: Number(w.high), medium: Number(w.medium) },
                    }),
                  "ওয়েট সংরক্ষিত হয়েছে",
                  setWErr
                );
              }}
            >
              ওয়েট সেভ করুন
            </button>
          </div>
        </div>
      </section>

      {/* ব্লক/অ্যালাও */}
      <section>
        <SectionHeading hint="ব্লকলিস্ট → Junk বাকেট, অ্যালাওলিস্ট → সরাসরি High (ফোন নম্বরের জন্য কার্যকর)">ব্লক / অ্যালাও লিস্ট</SectionHeading>
        <div className={`${CARD} space-y-4`}>
          <div className="flex rounded-full bg-surface-muted p-1">
            {(["block", "allow"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`h-10 flex-1 rounded-full font-body text-[13px] font-extrabold transition-all duration-brand ${
                  tab === t ? "bg-brand-light text-white" : "text-ink"
                }`}
              >
                {t === "block" ? "ব্লকলিস্ট" : "অ্যালাওলিস্ট"} ({data.entries.filter((e) => e.list === t).length})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[170px_1fr_1fr_auto]">
            <SelectBox value={kind} onChange={setKind}>
              <option value="phone">ফোন</option>
              <option value="email">ইমেইল</option>
              <option value="name_word">নামের শব্দ</option>
              <option value="address_word">ঠিকানার শব্দ</option>
              <option value="ip_hash">IP hash</option>
            </SelectBox>
            <input className={FIELD_CLS} value={value} onChange={(e) => setValue(e.target.value)} placeholder="মান" aria-label="মান" />
            <input className={FIELD_CLS} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="কারণ (ঐচ্ছিক)" aria-label="কারণ" />
            <button
              type="button"
              disabled={busy || !value.trim()}
              onClick={() => {
                setLErr(null);
                run(
                  async () => {
                    const r = await addListEntry(kind, value, tab, reason);
                    if (r.ok) {
                      setValue("");
                      setReason("");
                    }
                    return r;
                  },
                  "লিস্টে যোগ হয়েছে",
                  setLErr
                );
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand-light px-6 font-body text-[14px] font-black text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-[0.98] disabled:opacity-50"
            >
              <Icon name="plus" className="h-4 w-4" strokeWidth={2.8} />
              যোগ
            </button>
          </div>
          {lErr && (
            <p role="alert" className="font-body text-[12.5px] font-bold text-danger">
              {lErr}
            </p>
          )}

          {shown.length === 0 ? (
            <p className="py-6 text-center font-body text-[13px] font-semibold text-muted">এই তালিকা খালি।</p>
          ) : (
            <ul className="divide-y divide-border-base/40 rounded-2xl border border-border-base/70">
              {shown.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="break-all font-body text-[13.5px] font-extrabold text-ink">
                      {e.value} <Pill tone="gray" dot={false} className="ml-1 align-middle">{e.kind}</Pill>
                    </div>
                    <div className="truncate font-body text-[11px] font-semibold text-muted">
                      {timeAgoBn(e.created_at)}
                      {e.reason ? ` · ${e.reason}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDelEntry(e)}
                    aria-label="লিস্ট থেকে সরান"
                    title="সরান"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-red-200/80 bg-red-50 text-danger transition-all duration-brand active:scale-95 lg:h-9 lg:w-9"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {data.entriesTotal > data.entries.length && (
            <p className="font-body text-[11.5px] font-semibold text-muted">সর্বশেষ {data.entries.length}টি দেখানো হচ্ছে।</p>
          )}
        </div>
      </section>

      {/* স্টোর */}
      <section>
        <SectionHeading>স্টোর</SectionHeading>
        <div className={`${CARD} space-y-4`}>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="স্টোরের নাম" htmlFor="st-name" help="SMS টেমপ্লেটের {store}-এ বসে">
              <input id="st-name" className={FIELD_CLS} value={storeName} maxLength={60} onChange={(e) => setStoreName(e.target.value)} />
            </Field>
            <Field label="ডিফল্ট ভাষা">
              <SelectBox value={locale} onChange={setLocale}>
                <option value="bn">বাংলা</option>
                <option value="en">English</option>
              </SelectBox>
            </Field>
          </div>
          {sErr && (
            <p role="alert" className="font-body text-[12.5px] font-bold text-danger">
              {sErr}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy || (storeName === data.storeName && locale === data.locale)}
              className={SAVE_BTN}
              onClick={() => {
                setSErr(null);
                run(() => saveStoreSettings(storeName, locale), "স্টোর সেটিংস সংরক্ষিত হয়েছে", setSErr);
              }}
            >
              সেভ করুন
            </button>
          </div>
        </div>
      </section>

      {/* API কী */}
      <section>
        <SectionHeading hint="গোপন secret এখানে দেখানো হয় না — শুধু পরিচিতি-প্রিফিক্স">API কী</SectionHeading>
        <div className="overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-sh1">
          {data.keys.length === 0 ? (
            <p className="px-5 py-10 text-center font-body text-[13px] font-semibold text-muted">কোনো কী নেই।</p>
          ) : (
            <ul className="divide-y divide-border-base/40">
              {data.keys.map((k) => (
                <li key={k.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-body text-[13.5px] font-extrabold text-ink">
                      {k.name} <Pill tone="blue" dot={false} className="ml-1 align-middle">{k.scope}</Pill>
                    </div>
                    <div className="truncate font-body text-[11px] font-semibold text-muted">
                      {k.key_prefix}… · শেষ ব্যবহার {k.last_used_at ? timeAgoBn(k.last_used_at) : "কখনো না"}
                    </div>
                  </div>
                  <Switch checked={k.is_active} label={`${k.name} সক্রিয়/বন্ধ`} disabled={busy} onChange={() => setKeyToggle(k)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* অডিট */}
      <section>
        <SectionHeading hint="সর্বশেষ ২৫টি — পুরোটা Export Center থেকে নামান">অডিট লগ</SectionHeading>
        <div className="overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-sh1">
          {data.audit.length === 0 ? (
            <p className="px-5 py-10 text-center font-body text-[13px] font-semibold text-muted">এখনো কোনো অ্যাকশন লেখা হয়নি।</p>
          ) : (
            <ul className="divide-y divide-border-base/40">
              {data.audit.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-body text-[13.5px] font-extrabold text-ink">{auditLabel(a.action)}</div>
                    <div className="truncate font-body text-[11px] font-semibold text-muted">
                      {a.actor}
                      {a.target ? ` · ${a.target}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 text-right font-body text-[11px] font-semibold text-muted">{formatDateTimeBn(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {delEntry && (
        <ConfirmDialog
          title="লিস্ট থেকে সরাবেন?"
          message={`${delEntry.value} ${delEntry.list === "block" ? "ব্লকলিস্ট" : "অ্যালাওলিস্ট"} থেকে সরে যাবে।`}
          confirmLabel="সরান"
          busy={busy}
          onCancel={() => setDelEntry(null)}
          onConfirm={() => {
            const id = delEntry.id;
            setDelEntry(null);
            run(() => removeListEntry(id), "লিস্ট থেকে সরানো হয়েছে");
          }}
        />
      )}
      {keyToggle && (
        <ConfirmDialog
          tone={keyToggle.is_active ? "danger" : "brand"}
          title={keyToggle.is_active ? "API কী বন্ধ করবেন?" : "API কী চালু করবেন?"}
          message={
            keyToggle.is_active
              ? `“${keyToggle.name}” বন্ধ করলে এই কী দিয়ে আসা ${keyToggle.scope === "ingest" ? "ড্রাফট/অর্ডার ingest" : "এজেন্ট রিকোয়েস্ট"} প্রত্যাখ্যান হবে।`
              : `“${keyToggle.name}” আবার কাজ করবে।`
          }
          confirmLabel={keyToggle.is_active ? "বন্ধ করুন" : "চালু করুন"}
          busy={busy}
          onCancel={() => setKeyToggle(null)}
          onConfirm={() => {
            const k = keyToggle;
            setKeyToggle(null);
            run(() => setApiKeyActive(k.id, !k.is_active), k.is_active ? "কী বন্ধ হয়েছে" : "কী চালু হয়েছে");
          }}
        />
      )}
    </div>
  );
}
