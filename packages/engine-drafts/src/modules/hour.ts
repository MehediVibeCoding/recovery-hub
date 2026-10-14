import type { ScoreFactor } from "../types.ts";

export function scoreHour(hourOfDay: number | undefined): ScoreFactor | null {
  if (hourOfDay === undefined) return null;

  if (hourOfDay >= 0 && hourOfDay <= 4) {
    return { module: "hour", points: 70, reason: "গভীর রাতে অর্ডার — একা তেমন সন্দেহজনক না" };
  }
  return { module: "hour", points: 100, reason: "স্বাভাবিক সময়" };
}
