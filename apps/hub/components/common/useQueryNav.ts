"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * URL-চালিত ফিল্টার/পেজিনেশন: সার্ভার পেজ props হিসেবে বর্তমান params দেয়, এই হুক নতুন URL বানিয়ে
 * router.replace করে → সার্ভার আবার ডাটা আনে (ফিল্টার/সার্চ/পেজিনেশন সব সার্ভারে — DESIGN_SYSTEM §৮.২)।
 */
export function useQueryNav(current: Record<string, string>) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function set(updates: Record<string, string | null>, resetPage = true) {
    const next: Record<string, string> = { ...current };
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") delete next[k];
      else next[k] = v;
    }
    if (resetPage && !("page" in updates)) delete next.page;
    const qs = new URLSearchParams(next).toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function reset() {
    start(() => router.replace(pathname, { scroll: false }));
  }

  return { set, reset, pending };
}
