import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Only ever imported from API routes / Server
 * Actions / Server Components — never from a Client Component. The
 * "server-only" import above makes it a build error to accidentally bundle
 * this into client JS (hard constraint from doc 09: DB reachable only
 * server-side).
 */
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
