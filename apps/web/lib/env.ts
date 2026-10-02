/** Server/client env helpers. Missing Supabase config is allowed so lint/build still work. */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return { url, anonKey };
}

/** Comma-separated owner emails that may bootstrap admin + bypass invite for themselves. */
export function getOwnerEmails(): string[] {
  const raw = process.env.OWNER_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getOwnerEmails().includes(email.trim().toLowerCase());
}

export function getServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;
}
