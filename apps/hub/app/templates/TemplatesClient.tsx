"use client";

import { useState, useTransition } from "react";
import Modal from "../../components/common/Modal";
import Pill from "../../components/common/Pill";
import Icon from "../../components/common/Icon";
import Switch from "../../components/common/Switch";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import SectionHeading from "../../components/common/SectionHeading";
import { Field, FIELD_CLS, TEXTAREA_CLS } from "../../components/common/FormField";
import { useToast } from "../../components/common/Toast";
import { deleteTemplate, setTemplateEnabled, upsertTemplate } from "../actions/templates";
import { TEMPLATE_VARS, renderTemplate, smsSegments, unknownVars, type SmsTemplate } from "../../lib/templates";
import { timeAgoBn } from "../../lib/format";

interface Draft {
  id?: string;
  name: string;
  body: string;
  enabled: boolean;
  is_default: boolean;
}

const EMPTY: Draft = { name: "", body: "", enabled: true, is_default: false };

function SegmentInfo({ text }: { text: string }) {
  const s = smsSegments(text);
  const warn = s.segments > 2;
  return (
    <span className={`font-body text-[11px] font-bold ${warn ? "text-danger" : "text-muted"}`}>
      {s.chars} অক্ষর · {s.encoding} · {s.segments} SMS {warn ? "(খরচ বাড়বে — ছোট করুন)" : ""}
    </span>
  );
}

export default function TemplatesClient({
  initial,
  saved,
  vars,
}: {
  initial: SmsTemplate[];
  saved: boolean;
  vars: Record<string, string>;
}) {
  const { showToast } = useToast();
  const [items, setItems] = useState<SmsTemplate[]>(initial);
  const [isSaved, setIsSaved] = useState(saved);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDel, setConfirmDel] = useState<SmsTemplate | null>(null);
  const [busy, startBusy] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  function openEdit(t?: SmsTemplate) {
    setFormError(null);
    setEditing(t ? { id: t.id, name: t.name, body: t.body, enabled: t.enabled, is_default: t.is_default } : EMPTY);
  }

  function save() {
    if (!editing) return;
    setFormError(null);
    startBusy(async () => {
      const res = await upsertTemplate(editing);
      if (res.ok && res.data) {
        setItems(res.data);
        setIsSaved(true);
        setEditing(null);
        showToast("✅ টেমপ্লেট সংরক্ষিত হয়েছে");
      } else {
        setFormError(res.error ?? "সেভ করা যায়নি");
      }
    });
  }

  function toggle(t: SmsTemplate, v: boolean) {
    startBusy(async () => {
      const res = await setTemplateEnabled(t.id, v);
      if (res.ok && res.data) {
        setItems(res.data);
        setIsSaved(true);
        showToast(v ? "✅ টেমপ্লেট চালু হয়েছে" : "✅ টেমপ্লেট বন্ধ হয়েছে");
      } else showToast("❌ " + (res.error ?? "ব্যর্থ"));
    });
  }

  function remove(t: SmsTemplate) {
    startBusy(async () => {
      const res = await deleteTemplate(t.id);
      setConfirmDel(null);
      if (res.ok && res.data) {
        setItems(res.data);
        showToast("✅ টেমপ্লেট মোছা হয়েছে");
      } else showToast("❌ " + (res.error ?? "ব্যর্থ"));
    });
  }

  const preview = editing ? renderTemplate(editing.body, vars) : "";
  const unknown = editing ? unknownVars(editing.body) : [];

  return (
    <div className={busy ? "opacity-80 transition-opacity" : "transition-opacity"}>
      <div className="mb-4 rounded-[24px] border border-white/90 bg-white p-3.5 shadow-sh1 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="font-body text-[14px] font-extrabold text-ink">SMS টেমপ্লেট</div>
            <p className="mt-0.5 font-body text-[12px] font-medium text-muted">
              ডিফল্ট টেমপ্লেটটাই এজেন্ট ব্যবহার করবে। {"{name}"}, {"{items}"} ইত্যাদি পাঠানোর সময় আসল তথ্য দিয়ে বদলে যায়।
            </p>
            {!isSaved && (
              <p className="mt-1.5 font-body text-[11.5px] font-bold text-[#92400E]">
                এগুলো স্টার্টার টেমপ্লেট — এখনো সেভ হয়নি। কিছু বদলালে বা নতুন বানালে ডাটাবেজে সেভ হবে।
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => openEdit()}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-light px-6 font-body text-[14px] font-black text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-[0.98] lg:h-11"
          >
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.8} />
            নতুন টেমপ্লেট
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="template" title="কোনো টেমপ্লেট নেই" hint="উপরের বোতামে চেপে প্রথম টেমপ্লেট বানান" />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((t) => (
            <article key={t.id} className="flex flex-col rounded-[22px] border border-white/90 bg-white p-4 shadow-sh1">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-body text-[14px] font-extrabold text-ink">{t.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {t.is_default && <Pill tone="blue" dot={false}>ডিফল্ট</Pill>}
                    <Pill tone={t.enabled ? "green" : "gray"}>{t.enabled ? "চালু" : "বন্ধ"}</Pill>
                  </div>
                </div>
                <Switch
                  checked={t.enabled}
                  disabled={busy}
                  label={`${t.name} চালু/বন্ধ`}
                  onChange={(v) => toggle(t, v)}
                />
              </div>
              <p className="mt-3 flex-1 whitespace-pre-wrap break-words rounded-2xl bg-surface-muted/70 p-3 font-body text-[12.5px] font-medium leading-relaxed text-ink">
                {renderTemplate(t.body, vars)}
              </p>
              <div className="mt-2">
                <SegmentInfo text={renderTemplate(t.body, vars)} />
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-border-base/60 pt-3">
                <span className="min-w-0 flex-1 truncate font-body text-[11px] font-semibold text-muted">
                  {t.updated_at && new Date(t.updated_at).getTime() > 0 ? `আপডেট ${timeAgoBn(t.updated_at)}` : "স্টার্টার"}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  aria-label={`${t.name} এডিট`}
                  title="এডিট"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-light text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-95 lg:h-9 lg:w-9"
                >
                  <Icon name="edit" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDel(t)}
                  aria-label={`${t.name} মুছুন`}
                  title="মুছুন"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-red-200/80 bg-red-50 text-danger transition-all duration-brand active:scale-95 lg:h-9 lg:w-9"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          eyebrow="SMS টেমপ্লেট"
          title={editing.id ? "টেমপ্লেট এডিট" : "নতুন টেমপ্লেট"}
          onClose={() => !busy && setEditing(null)}
          maxWidth="max-w-[720px]"
          footer={
            <>
              {formError && (
                <p role="alert" className="mb-2.5 font-body text-[12.5px] font-bold text-danger">
                  {formError}
                </p>
              )}
              <div className="grid grid-cols-[1fr_2fr] gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                  className="h-12 rounded-full bg-surface-muted font-body text-[13.5px] font-extrabold text-ink transition-all duration-brand hover:bg-border-base active:scale-[0.98] disabled:opacity-60"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={save}
                  className="h-12 rounded-full bg-brand-light font-body text-[14px] font-black text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-[0.98] disabled:opacity-60"
                >
                  {busy ? "সেভ হচ্ছে..." : "সেভ করুন"}
                </button>
              </div>
            </>
          }
        >
          <div className="space-y-8">
            <section className="space-y-3.5">
              <Field label="টেমপ্লেটের নাম" required htmlFor="tpl-name">
                <input
                  id="tpl-name"
                  className={FIELD_CLS}
                  value={editing.name}
                  maxLength={60}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="যেমন: সাধারণ রিমাইন্ডার"
                />
              </Field>
              <Field label="মেসেজের লেখা" required htmlFor="tpl-body" help={<SegmentInfo text={preview} />}>
                <textarea
                  id="tpl-body"
                  rows={5}
                  maxLength={600}
                  className={TEXTAREA_CLS}
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  placeholder="{name}, আপনার কার্টে {items} রয়ে গেছে..."
                />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setEditing({ ...editing, body: editing.body + `{${v.key}}` })}
                    title={v.label}
                    className="h-11 rounded-full border border-brand-light/40 bg-brand-light/10 px-3.5 font-body text-[12px] font-extrabold text-ink transition-all duration-brand active:scale-95 lg:h-9"
                  >
                    {`{${v.key}}`}
                    <span className="ml-1.5 font-semibold text-muted">{v.label}</span>
                  </button>
                ))}
              </div>
              {unknown.length > 0 && (
                <p role="alert" className="rounded-xl bg-[#FEF3C7] px-3 py-2 font-body text-[12px] font-bold text-[#92400E]">
                  অজানা ভ্যারিয়েবল: {unknown.map((u) => `{${u}}`).join(", ")} — পাঠানোর সময় এগুলো যেমন আছে তেমনই যাবে।
                </p>
              )}
            </section>

            <section>
              <SectionHeading hint="নমুনা তথ্য দিয়ে দেখানো হচ্ছে">প্রিভিউ</SectionHeading>
              <div className="rounded-[20px] bg-surface-muted/70 p-4">
                <div className="ml-auto max-w-[92%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-light px-4 py-3 font-body text-[13px] font-medium leading-relaxed text-white">
                  {preview || "মেসেজ লিখলে প্রিভিউ এখানে দেখা যাবে"}
                </div>
              </div>
            </section>

            <section className="space-y-2.5">
              <div className="flex items-center gap-3 rounded-2xl border border-border-base/80 bg-surface-muted/60 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <div className="font-body text-[13.5px] font-extrabold text-ink">চালু</div>
                  <div className="font-body text-[11.5px] font-medium text-muted">বন্ধ টেমপ্লেট এজেন্ট ব্যবহার করবে না</div>
                </div>
                <Switch
                  checked={editing.enabled || editing.is_default}
                  disabled={editing.is_default}
                  label="চালু"
                  onChange={(v) => setEditing({ ...editing, enabled: v })}
                />
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border-base/80 bg-surface-muted/60 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <div className="font-body text-[13.5px] font-extrabold text-ink">ডিফল্ট টেমপ্লেট</div>
                  <div className="font-body text-[11.5px] font-medium text-muted">একটাই ডিফল্ট থাকে; এটা বেছে নিলে আগেরটা সরে যাবে</div>
                </div>
                <Switch
                  checked={editing.is_default}
                  label="ডিফল্ট"
                  onChange={(v) => setEditing({ ...editing, is_default: v, enabled: v ? true : editing.enabled })}
                />
              </div>
            </section>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <ConfirmDialog
          title="টেমপ্লেট মুছবেন?"
          message={`“${confirmDel.name}” স্থায়ীভাবে মুছে যাবে।${confirmDel.is_default ? " এটা ডিফল্ট ছিল — মুছলে বাকিদের প্রথমটা ডিফল্ট হবে।" : ""}`}
          confirmLabel="মুছে ফেলুন"
          busy={busy}
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => remove(confirmDel)}
        />
      )}
    </div>
  );
}
