"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  addAllowlistEmail,
  createInvite,
  removeAllowlistEmail,
  type AllowlistRow,
  type InviteRow,
} from "./actions";

export function AdminPanel({
  initialAllowlist,
  initialInvites,
}: {
  initialAllowlist: AllowlistRow[];
  initialInvites: InviteRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  function onAddEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await addAllowlistEmail(email, note);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail("");
      setNote("");
      setMessage(`Allowlisted ${email.trim().toLowerCase()}`);
      refresh();
    });
  }

  function onCreateInvite() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createInvite();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLastInvite(result.code);
      setMessage("Invite created — copy the code below.");
      refresh();
    });
  }

  function onRemove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeAllowlistEmail(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  return (
    <>
      <div className="card">
        <h2 className="section-title">Allowlist</h2>
        <form onSubmit={onAddEmail} className="stack">
          <label className="field">
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="friend@example.com"
            />
          </label>
          <label className="field">
            <span>Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="friend" />
          </label>
          <button type="submit" className="btn" disabled={pending}>
            Add email
          </button>
        </form>

        <ul className="list">
          {initialAllowlist.length === 0 ? (
            <li className="muted">No allowlisted emails yet.</li>
          ) : (
            initialAllowlist.map((row) => (
              <li key={row.id} className="list-row">
                <div>
                  <strong>{row.email}</strong>
                  {row.note ? <span className="muted"> — {row.note}</span> : null}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  disabled={pending}
                  onClick={() => onRemove(row.id)}
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="card">
        <h2 className="section-title">Invite codes</h2>
        <button type="button" className="btn" disabled={pending} onClick={onCreateInvite}>
          Create invite
        </button>
        {lastInvite ? (
          <p style={{ marginTop: 12 }}>
            New code: <code>{lastInvite}</code>
          </p>
        ) : null}
        <ul className="list">
          {initialInvites.length === 0 ? (
            <li className="muted">No invites yet.</li>
          ) : (
            initialInvites.map((row) => (
              <li key={row.id} className="list-row">
                <div>
                  <code>{row.code}</code>
                  <span className="muted">
                    {" "}
                    · {row.redeemed_by ? `redeemed ${row.redeemed_at ?? ""}` : "unused"}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {message ? <p className="ok-text">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </>
  );
}
