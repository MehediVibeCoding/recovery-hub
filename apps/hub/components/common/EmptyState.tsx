import Icon, { IconName } from "./Icon";

export default function EmptyState({
  icon = "inbox",
  title,
  hint,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-[24px] border border-white/90 bg-white px-6 py-16 text-center shadow-sh1 lg:rounded-none lg:border-0 lg:shadow-none">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light/15 text-brand-light">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <span className="font-body text-[14px] font-extrabold text-ink">{title}</span>
      {hint && <span className="font-body text-[12px] font-medium text-muted">{hint}</span>}
    </div>
  );
}
