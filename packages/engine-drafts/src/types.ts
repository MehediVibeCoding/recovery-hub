/**
 * Input shape for the Recovery Hub draft scoring engine.
 * Built fresh for draft/abandoned-checkout data — NOT the same shape as the
 * owner's existing order-scoring engine on the live store, which is left
 * untouched. Exact field list will be confirmed in Phase 1 against the real
 * Vangcur checkout fields.
 */
export interface DraftInput {
  name?: string;
  phoneRaw?: string;
  email?: string;
  address?: string;
  district?: string;
  upazila?: string;
  cartTotal?: number;
  cartItems?: { id: string; qty: number }[];
  hourOfDay?: number; // 0-23, Asia/Dhaka
  history?: { delivered: number; returned: number; cancelled: number };
  courier?: { success: number; total: number };
  behavior?: { honeypotFilled?: boolean; humanInteraction?: boolean };
}

export type TrustBucket = "junk" | "low" | "review" | "high" | "no_contact";

export interface ScoreFactor {
  module: string;
  points: number;
  reason: string;
}

export interface ScoreResult {
  score: number; // 0-100
  bucket: TrustBucket;
  confidence: number; // 0-1
  phoneNormalized: string | null;
  factors: ScoreFactor[];
}
