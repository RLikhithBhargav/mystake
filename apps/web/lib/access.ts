import type { User } from "@supabase/supabase-js";

import { isOwnerEmail } from "@/lib/env";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type AccessState = {
  user: User;
  email: string;
  accessGranted: boolean;
  isAdmin: boolean;
};

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Sync allowlist grant (RPC) and, for OWNER_EMAILS, bootstrap allowlist + admin via service role.
 */
export async function resolveAccess(): Promise<AccessState | null> {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  const email = (user.email ?? "").trim().toLowerCase();

  // Ensure allowlisted users get access_granted flipped.
  await supabase.rpc("grant_access_if_allowlisted");

  let { data: profile } = await supabase
    .from("profiles")
    .select("access_granted, is_admin, email")
    .eq("id", user.id)
    .maybeSingle();

  // Owner bootstrap: first sign-in without manual SQL.
  if (isOwnerEmail(email) && (!profile?.access_granted || !profile?.is_admin)) {
    try {
      const admin = createServiceClient();
      await admin
        .from("allowlist_emails")
        .upsert({ email, note: "owner bootstrap" }, { onConflict: "email" });
      await admin.from("profiles").upsert(
        {
          id: user.id,
          email,
          access_granted: true,
          is_admin: true,
        },
        { onConflict: "id" },
      );
      profile = { access_granted: true, is_admin: true, email };
    } catch {
      // Service role missing — owner must bootstrap via SQL (see supabase/README.md).
    }
  }

  // Re-read after possible bootstrap / grant.
  if (!profile || profile.access_granted === undefined) {
    const again = await supabase
      .from("profiles")
      .select("access_granted, is_admin, email")
      .eq("id", user.id)
      .maybeSingle();
    profile = again.data;
  }

  const accessGranted = Boolean(profile?.access_granted);
  const isAdmin = Boolean(profile?.is_admin) || isOwnerEmail(email);

  return {
    user,
    email,
    accessGranted,
    isAdmin,
  };
}
