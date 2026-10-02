"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton({ next }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next?.startsWith("/")) {
      redirectTo.searchParams.set("next", next);
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });
    if (oauthError) {
      setError(oauthError.message);
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn" onClick={signIn} disabled={pending}>
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
