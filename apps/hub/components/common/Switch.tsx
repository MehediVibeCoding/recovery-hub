"use client";

export default function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-11 w-14 shrink-0 items-center justify-center disabled:opacity-50"
    >
      <span
        className={`flex h-7 w-12 items-center rounded-full p-0.5 transition-all duration-brand ${
          checked ? "bg-brand-light" : "bg-border-base"
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full bg-white shadow-sh1 transition-all duration-brand ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
