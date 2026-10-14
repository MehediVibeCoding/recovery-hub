// সব পেজের সাধারণ লোডিং স্কেলিটন (animate-pulse অনুমোদিত)
export default function Loading() {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label="লোড হচ্ছে">
      <div className="h-[72px] rounded-[24px] bg-white/80" />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-[20px] bg-white/80" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-[20px] bg-white/80" />
      ))}
    </div>
  );
}
