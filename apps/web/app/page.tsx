import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/env";
import { ApiStatus } from "./api-status";

export default async function Home() {
  if (isSupabaseConfigured()) {
    const access = await resolveAccess();
    if (access?.accessGranted) {
      redirect("/app");
    }
    if (access && !access.accessGranted) {
      redirect("/access");
    }
  }

  return (
    <main>
      <span className="tag">Phase 1 · auth + access gate</span>
      <h1>MyStake</h1>
      <p className="muted">
        Personal investment coaching copilot for US + India markets. Sign in with Google — access is
        allowlist- or invite-gated.
      </p>

      <div className="card actions-row">
        <Link href="/login" className="btn">
          Sign in
        </Link>
      </div>

      <div className="card">
        <ApiStatus />
      </div>

      <p className="muted" style={{ marginTop: 24, fontSize: 13 }}>
        Not a broker and not registered investment advice — informational coaching only.
      </p>
    </main>
  );
}
