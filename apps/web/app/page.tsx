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
      <div className="page-hero">
        <span className="page-kicker">US + India coaching</span>
        <h1>MyStake</h1>
        <p className="lede">
          Personal investment coaching copilot. Sign in with Google — access is allowlist- or
          invite-gated.
        </p>
      </div>

      <div className="card actions-row">
        <Link href="/login" className="btn">
          Sign in
        </Link>
      </div>

      <div className="card card-quiet">
        <ApiStatus />
      </div>

      <p className="disclaimer">
        Not a broker and not registered investment advice — informational coaching only.
      </p>
    </main>
  );
}
