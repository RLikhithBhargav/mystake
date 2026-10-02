"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { resolveAccess } from "@/lib/access";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type AllowlistRow = {
  id: string;
  email: string;
  note: string | null;
  created_at: string;
};

export type InviteRow = {
  id: string;
  code: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  expires_at: string | null;
  created_at: string;
};

async function requireAdmin() {
  const access = await resolveAccess();
  if (!access?.accessGranted || !access.isAdmin) {
    throw new Error("Admin access required");
  }
  return access;
}

/** Prefer service role when configured; otherwise user client (requires profiles.is_admin). */
async function adminDb() {
  const access = await requireAdmin();
  try {
    return { access, db: createServiceClient() };
  } catch {
    return { access, db: await createClient() };
  }
}

export async function listAllowlist(): Promise<AllowlistRow[]> {
  const { db } = await adminDb();
  const { data, error } = await db
    .from("allowlist_emails")
    .select("id, email, note, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listInvites(): Promise<InviteRow[]> {
  const { db } = await adminDb();
  const { data, error } = await db
    .from("invites")
    .select("id, code, redeemed_by, redeemed_at, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addAllowlistEmail(
  email: string,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, error: "Enter a valid email." };
  }

  try {
    const { access, db } = await adminDb();
    const { error } = await db.from("allowlist_emails").upsert(
      {
        email: normalized,
        note: note?.trim() || null,
        created_by: access.user.id,
      },
      { onConflict: "email" },
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to add email" };
  }
}

export async function removeAllowlistEmail(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { db } = await adminDb();
    const { error } = await db.from("allowlist_emails").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to remove email" };
  }
}

export async function createInvite(): Promise<
  { ok: true; code: string } | { ok: false; error: string }
> {
  try {
    const { access, db } = await adminDb();
    const code = randomBytes(8).toString("hex");
    const { error } = await db.from("invites").insert({
      code,
      created_by: access.user.id,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    return { ok: true, code };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create invite" };
  }
}
