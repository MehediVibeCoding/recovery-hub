export type PillTone = "green" | "blue" | "amber" | "red" | "purple" | "gray";

// রং ORDER_STATUS_META (Mehediadmin §২.১)-এর পরিবার থেকে
const TONES: Record<PillTone, { dot: string; cls: string }> = {
  green: { dot: "#10B981", cls: "bg-[#D1FAE5] text-[#065F46]" },
  blue: { dot: "#44A7FC", cls: "bg-[#E3F2FF] text-[#0F6FC6]" },
  amber: { dot: "#F59E0B", cls: "bg-[#FEF3C7] text-[#92400E]" },
  red: { dot: "#EF4444", cls: "bg-[#FEE2E2] text-[#B91C1C]" },
  purple: { dot: "#8B5CF6", cls: "bg-[#EDE9FE] text-[#6D28D9]" },
  gray: { dot: "#9CA3AF", cls: "bg-surface-muted text-muted" },
};

export default function Pill({
  tone,
  children,
  dot = true,
  className = "",
}: {
  tone: PillTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-body text-[11px] font-extrabold leading-none ${t.cls} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.dot }} />}
      {children}
    </span>
  );
}
