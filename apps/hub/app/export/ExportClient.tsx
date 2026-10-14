"use client";

import { useState } from "react";
import Icon from "../../components/common/Icon";
import { DateInput, ToolbarSelect } from "../../components/common/Toolbar";
import { formatNumber } from "../../lib/format";

interface DatasetInfo {
  kind: string;
  title: string;
  description: string;
  filters: ("status" | "bucket" | "dnc")[];
  total: number;
}

const DRAFT_STATUSES = ["draft", "contacted", "recovered", "lost", "invalid", "junk"];
const BUCKETS = ["high", "medium", "review", "junk", "no_contact"];

function ExportCard({ ds, orderStatuses, cap }: { ds: DatasetInfo; orderStatuses: string[]; cap: number }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [bucket, setBucket] = useState("");
  const [dnc, setDnc] = useState("");

  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (status) qs.set("status", status);
  if (bucket) qs.set("bucket", bucket);
  if (dnc) qs.set("dnc", dnc);
  const href = `/api/export/${ds.kind}${qs.toString() ? `?${qs}` : ""}`;
  const statuses = ds.kind === "drafts" ? DRAFT_STATUSES : orderStatuses;

  return (
    <article className="flex flex-col rounded-[24px] border border-white/90 bg-white p-4 shadow-sh1 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light/15 text-brand-light">
          <Icon name="download" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-body text-[15px] font-black text-ink">{ds.title}</h3>
          <p className="mt-0.5 font-body text-[12px] font-medium text-muted">{ds.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 font-body text-[12px] font-black text-ink">
          {formatNumber(ds.total)} সারি
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <DateInput label="থেকে" value={from} onChange={setFrom} />
          <DateInput label="পর্যন্ত" value={to} onChange={setTo} />
        </div>
        {(ds.filters.includes("status") || ds.filters.includes("bucket")) && (
          <div className="grid grid-cols-2 gap-2.5">
            {ds.filters.includes("status") && (
              <ToolbarSelect label="স্ট্যাটাস" value={status} onChange={setStatus}>
                <option value="">সব স্ট্যাটাস</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </ToolbarSelect>
            )}
            {ds.filters.includes("bucket") && (
              <ToolbarSelect label="বাকেট" value={bucket} onChange={setBucket}>
                <option value="">সব বাকেট</option>
                {BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </ToolbarSelect>
            )}
          </div>
        )}
        {ds.filters.includes("dnc") && (
          <ToolbarSelect label="DNC" value={dnc} onChange={setDnc}>
            <option value="">সব কন্টাক্ট</option>
            <option value="1">শুধু DNC</option>
          </ToolbarSelect>
        )}
      </div>

      <a
        href={href}
        download
        className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-brand-light font-body text-[14px] font-black text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-[0.98]"
      >
        <Icon name="download" className="h-4 w-4" strokeWidth={2.6} />
        CSV ডাউনলোড
      </a>
      <p className="mt-2 font-body text-[11px] font-medium text-muted">সর্বোচ্চ {formatNumber(cap)} সারি · তারিখ ঢাকার সময় অনুযায়ী</p>
    </article>
  );
}

export default function ExportClient({
  datasets,
  orderStatuses,
  cap,
}: {
  datasets: DatasetInfo[];
  orderStatuses: string[];
  cap: number;
}) {
  return (
    <div>
      <p className="mb-4 rounded-[20px] border border-white/90 bg-white px-4 py-3 font-body text-[12.5px] font-semibold text-muted shadow-sh1">
        CSV ফাইল Excel-এ বাংলা সহ ঠিকঠাক খুলবে। প্রতিটা এক্সপোর্ট অডিট লগে লেখা থাকে।
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {datasets.map((ds) => (
          <ExportCard key={ds.kind} ds={ds} orderStatuses={orderStatuses} cap={cap} />
        ))}
      </div>
    </div>
  );
}
