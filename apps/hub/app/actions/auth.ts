"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { writeAudit } from "../../lib/audit";
import { clientIp } from "../../lib/auth/request";
import { SESSION_COOKIE, sessionCookieOptions } from "../../lib/auth/session";

/** লগআউট — কুকি মুছে দেয়। এরপর সেশন না থাকায় সব URL 404 */
export async function hubLogout() {
  const ip = clientIp(await headers());
  // __Host- কুকি মুছতে Secure অ্যাট্রিবিউটসহ expire করতে হয় (delete() তা দেয় না)
  (await cookies()).set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  await writeAudit("logout", null, { ip });
  redirect("/");
}
