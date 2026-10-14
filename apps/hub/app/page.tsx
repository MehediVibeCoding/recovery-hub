const STAT_CARDS = [
  { label: "আজকের Drafts", value: "—" },
  { label: "Recovered (7d)", value: "—" },
  { label: "Recovery Rate", value: "—" },
  { label: "Agent Status", value: "Not wired yet" },
];

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-white/60">
          Phase 0 skeleton — আসল ডাটা Phase 1-এ (ingest + ডাটাবেজ) চালু হবে।
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-white/10 bg-white/5 p-4"
          >
            <div className="text-xs text-white/50">{card.label}</div>
            <div className="mt-1 text-2xl font-semibold">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
