// আইকনবিহীন ডিটেইল-টাইল — DESIGN_SYSTEM §৬.৬
export default function DetailTile({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border-base/80 border-l-[3.5px] border-l-brand-light bg-surface-muted/60 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block font-body text-[10.5px] font-extrabold uppercase tracking-wider text-muted">{label}</span>
        <span
          className={`mt-1 block break-words font-body text-[15px] font-extrabold leading-snug text-ink ${
            mono ? "tabular-nums" : ""
          }`}
        >
          {children}
        </span>
      </span>
    </div>
  );
}
