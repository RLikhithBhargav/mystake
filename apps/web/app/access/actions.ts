"use server";

import { createClient } from "@/lib/supabase/server";

export async function redeemInvite(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter an invite code." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const { error } = await supabase.rpc("redeem_invite", { invite_code: trimmed });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
