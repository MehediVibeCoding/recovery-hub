import { z } from "zod";

/**
 * Exact shape from contracts/api-contracts.md §2 (POST /api/ingest/draft).
 * Unknown fields are rejected (.strict()) so a typo on the store side fails
 * loudly instead of silently dropping data.
 */
export const CartItemSchema = z
  .object({
    product_id: z.string(),
    name: z.string(),
    sku: z.string().optional(),
    qty: z.number().int().positive(),
    price: z.number().nonnegative(),
    image: z.string().url().optional(),
  })
  .strict();

export const DraftIngestSchema = z
  .object({
    session_id: z.string().min(8).max(128),
    customer_name: z.string().max(200).optional(),
    phone: z.string().max(32).optional(),
    email: z.string().email().max(200).optional(),
    address: z.string().max(500).optional(),
    district: z.string().max(100).optional(),
    upazila: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
    cart_items: z.array(CartItemSchema).max(50).optional(),
    cart_total: z.number().nonnegative().optional(),
    currency: z.literal("BDT").optional(),
    utm: z
      .object({
        source: z.string().max(100).optional(),
        medium: z.string().max(100).optional(),
        campaign: z.string().max(100).optional(),
      })
      .strict()
      .optional(),
    landing_url: z.string().max(500).optional(),
    user_agent: z.string().max(500).optional(),
    ip: z.string().max(64).optional(),
    hour_of_day: z.number().int().min(0).max(23).optional(),
    behavior: z
      .object({
        honeypotFilled: z.boolean().optional(),
        humanInteraction: z.boolean().optional(),
      })
      .strict()
      .optional(),
    client_ts: z.string().optional(),
  })
  .strict()
  .refine((v) => Boolean(v.phone) || Boolean(v.email), {
    message: "phone অথবা email-এর অন্তত একটা লাগবে",
  });

export type DraftIngestPayload = z.infer<typeof DraftIngestSchema>;

export const OrderIngestSchema = z
  .object({
    external_order_id: z.string().min(1).max(100),
    session_id: z.string().min(8).max(128).optional(),
    customer_name: z.string().max(200).optional(),
    phone: z.string().max(32).optional(),
    email: z.string().email().max(200).optional(),
    address: z.string().max(500).optional(),
    district: z.string().max(100).optional(),
    items: z
      .array(
        z
          .object({
            product_id: z.string(),
            name: z.string(),
            qty: z.number().int().positive(),
            price: z.number().nonnegative(),
          })
          .strict()
      )
      .max(50)
      .optional(),
    subtotal: z.number().nonnegative().optional(),
    shipping: z.number().nonnegative().optional(),
    discount: z.number().nonnegative().optional(),
    total: z.number().nonnegative(),
    payment_method: z.string().max(50).optional(),
    payment_status: z.enum(["unpaid", "paid", "partial"]).optional(),
    order_status: z.enum([
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "returned",
      "cancelled",
    ]),
    order_created_at: z.string(),
    raw: z.record(z.unknown()).optional(),
  })
  .strict();

export type OrderIngestPayload = z.infer<typeof OrderIngestSchema>;
