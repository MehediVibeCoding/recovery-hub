import type { ScoreFactor } from "../types.ts";

export function scoreBehavior(
  behavior: { honeypotFilled?: boolean; humanInteraction?: boolean } | undefined
): ScoreFactor | null {
  if (!behavior) return null;

  if (behavior.honeypotFilled) {
    return { module: "behavior", points: 0, reason: "হানিপট ফিল্ড পূরণ হয়েছে — বট সন্দেহ" };
  }
  if (behavior.humanInteraction === false) {
    return { module: "behavior", points: 30, reason: "মানুষের মতো ইন্টারঅ্যাকশন পাওয়া যায়নি" };
  }
  return { module: "behavior", points: 100, reason: "স্বাভাবিক মানুষের ইন্টারঅ্যাকশন" };
}
