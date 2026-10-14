"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const INPUT_CLS =
  "h-11 w-full rounded-full border border-border-base/80 bg-surface-muted/50 pl-11 pr-10 font-body text-[13px] font-medium text-ink transition-all duration-brand placeholder:text-muted/70 focus:bg-white lg:h-10";

// সার্চ — ৩৫০ms ডিবাউন্স, URL-এ ঠেলে দেয় (সার্ভারে খোঁজা হয়)
export function SearchBox({
  value,
  onSearch,
  placeholder,
}: {
  value: string;
  onSearch: (v: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(value);
  const first = useRef(true);

  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (text === value) return;
    const t = setTimeout(() => onSearch(text.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="relative min-w-0 flex-1">
      <Icon
        name="search"
        className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-brand-light"
        strokeWidth={2.2}
      />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={INPUT_CLS}
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText("");
            onSearch("");
          }}
          aria-label="সার্চ মুছুন"
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted active:scale-95"
        >
          <Icon name="close" className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// ফিল্টার চিপ (কাউন্টসহ) — DESIGN_SYSTEM §৫.৩
export function Chip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 font-body text-[12px] font-extrabold transition-all duration-brand active:scale-95 lg:h-9 ${
        active
          ? "border-brand-light bg-brand-light text-white"
          : "border-border-base/80 bg-white text-ink hover:border-brand-light hover:text-brand-light"
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`min-w-[22px] rounded-full px-1.5 text-center text-[10.5px] font-black leading-[18px] ${
            active ? "bg-white/25 text-white" : "bg-surface-muted text-muted"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar -mx-3.5 mt-3 flex gap-2 overflow-x-auto px-3.5 pb-0.5 sm:-mx-4 sm:px-4">{children}</div>
  );
}

export function ResetChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-red-200/80 bg-red-50 px-3.5 font-body text-[12px] font-extrabold text-danger transition-all duration-brand active:scale-95 lg:h-9"
    >
      <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.5} />
      রিসেট
    </button>
  );
}

// ছোট ইনলাইন select — টুলবারের জন্য (নেটিভ তীর নেই, নিজের চেভ্রন)
export function ToolbarSelect({
  value,
  onChange,
  label,
  children,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        title={label}
        className="h-11 w-full appearance-none rounded-full border border-border-base/80 bg-white pl-4 pr-9 font-body text-[12.5px] font-bold text-ink transition-all duration-brand lg:h-10"
      >
        {children}
      </select>
      <Icon
        name="chevron"
        className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-light"
        strokeWidth={2.6}
      />
    </div>
  );
}

export function DateInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border-base/80 bg-white pl-4 pr-3 font-body text-[11px] font-extrabold text-muted lg:flex-none">
      <span className="shrink-0">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-w-0 flex-1 bg-transparent font-body text-[12.5px] font-bold text-ink lg:h-10"
      />
    </label>
  );
}
