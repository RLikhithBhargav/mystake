"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type Health = { status: string; service: string; version: string };

export function ApiStatus() {
  const [state, setState] = useState<"pending" | "ok" | "down">("pending");
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/health`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Health) => {
        if (!cancelled) {
          setHealth(data);
          setState("ok");
        }
      })
      .catch(() => {
        if (!cancelled) setState("down");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="status-row">
        <span className={`dot ${state === "ok" ? "ok" : state === "down" ? "down" : ""}`} />
        <span>
          {state === "pending" && "Checking FastAPI backend…"}
          {state === "ok" && "FastAPI backend is reachable."}
          {state === "down" && "FastAPI backend is not reachable."}
        </span>
      </div>
      {health && (
        <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
          <code>GET /health</code> → service <code>{health.service}</code>, version{" "}
          <code>{health.version}</code>
        </p>
      )}
      <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
        API base: <code>{API_BASE}</code>
      </p>
    </div>
  );
}
