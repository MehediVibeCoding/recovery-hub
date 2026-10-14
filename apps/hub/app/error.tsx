"use client";

import PageErrorBox from "../components/common/PageErrorBox";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-3">
      <PageErrorBox
        title="পেজ লোড করতে সমস্যা হয়েছে"
        message={error.message || "অজানা ত্রুটি"}
        hint="Supabase env variable (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) ঠিক আছে কিনা এবং ডাটাবেজ সংযোগ যাচাই করুন।"
      />
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={reset}
          className="h-12 w-full rounded-full bg-brand-light font-body text-[14px] font-black text-white transition-all duration-brand hover:bg-brand-light-hover active:scale-[0.98]"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    </div>
  );
}
