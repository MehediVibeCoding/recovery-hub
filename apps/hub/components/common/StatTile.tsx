import Icon, { IconName } from "./Icon";

// সামারি টাইল — DESIGN_SYSTEM §৫.৭
export default function StatTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: IconName;
}) {
  return (
    <div className="min-w-0 rounded-[20px] border border-white/90 bg-white p-3 shadow-sh1 sm:p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light/15 text-brand-light">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 font-body text-[10.5px] font-extrabold uppercase leading-tight tracking-wide text-muted">
          {label}
        </span>
      </div>
      <div className="mt-2.5 truncate font-body text-[20px] font-black leading-none text-ink sm:text-[22px]">{value}</div>
      {sub && <div className="mt-1.5 truncate font-body text-[11px] font-semibold text-muted">{sub}</div>}
    </div>
  );
}
