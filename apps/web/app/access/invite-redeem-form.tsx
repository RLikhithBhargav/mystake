"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { redeemInvite } from "./actions";

export function InviteRedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await redeemInvite(code);
      if (result.ok) {
        router.replace("/app");
        router.refresh();
        return;
      }
      setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <label className="field">
        <span>Invite code</span>
        <input
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          placeholder="paste code"
          required
        />
      </label>
      <button type="submit" className="btn" disabled={pending || !code.trim()}>
        {pending ? "Checking…" : "Redeem"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
