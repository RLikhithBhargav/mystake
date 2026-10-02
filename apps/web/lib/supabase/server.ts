import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getServiceRoleKey, getSupabasePublicEnv } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies are read-only; middleware refreshes sessions.
        }
      },
    },
  });
}

/** Service-role client for owner bootstrap / admin mutations. Never expose to the browser. */
export function createServiceClient() {
  const { url } = getSupabasePublicEnv();
  const serviceKey = getServiceRoleKey();
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY (and URL) required for admin operations");
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
