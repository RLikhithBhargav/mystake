import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";

import { GoogleSignInButton } from "./google-sign-in-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  if (isSupabaseConfigured()) {
    const access = await resolveAccess();
    if (access?.accessGranted) {
      redirect(params.next && params.next.startsWith("/") ? params.next : "/app");
    }
    if (access && !access.accessGranted) {
      redirect("/access");
    }
  }

  return (
    <main>
      <span className="tag">Phase 1 · access gate</span>
      <h1>MyStake</h1>
      <p className="muted">
        Sign in with Google. Access is limited to allowlisted emails or a valid invite code.
      </p>

      <div className="card">
        {!isSupabaseConfigured() ? (
          <p className="muted">
            Supabase is not configured. Copy <code>apps/web/.env.example</code> to{" "}
            <code>.env.local</code>, add your project URL and anon key, and apply{" "}
            <code>supabase/migrations</code>. See <code>supabase/README.md</code>.
          </p>
        ) : (
          <>
            {params.error === "auth" ? (
              <p className="error" style={{ marginTop: 0 }}>
                Sign-in failed. Try again, or check Google OAuth redirect URLs in Supabase.
              </p>
            ) : null}
            <GoogleSignInButton next={params.next} />
          </>
        )}
      </div>

      <p className="muted" style={{ marginTop: 24, fontSize: 13 }}>
        <Link href="/">Back</Link> · Not a broker — informational coaching only.
      </p>
    </main>
  );
}
