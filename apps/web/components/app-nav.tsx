import Link from "next/link";

import { SignOutButton } from "@/app/sign-out-button";

export function AppNav({
  email,
  isAdmin,
  active,
}: {
  email: string;
  isAdmin?: boolean;
  active: "home" | "holdings" | "onboarding" | "admin";
}) {
  return (
    <header className="app-nav">
      <Link href="/app" className="brand-mark">
        MyStake
      </Link>
      <nav className="app-nav-links" aria-label="App">
        <Link href="/app" className={active === "home" ? "nav-link active" : "nav-link"}>
          Home
        </Link>
        <Link
          href="/app/holdings"
          className={active === "holdings" ? "nav-link active" : "nav-link"}
        >
          Holdings
        </Link>
        <Link
          href="/onboarding"
          className={active === "onboarding" ? "nav-link active" : "nav-link"}
        >
          Profile
        </Link>
        {isAdmin ? (
          <Link href="/admin" className={active === "admin" ? "nav-link active" : "nav-link"}>
            Admin
          </Link>
        ) : null}
      </nav>
      <div className="app-nav-meta">
        <span className="nav-email">{email}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
