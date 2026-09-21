import { ApiStatus } from "./api-status";

export default function Home() {
  return (
    <main>
      <span className="tag">Phase 0 · bootable skeleton</span>
      <h1>MyStake</h1>
      <p className="muted">
        Personal investment coaching copilot for US + India markets. This is the placeholder web
        shell — onboarding, dashboard, and chat land in later phases.
      </p>

      <div className="card">
        <div className="status-row">
          <span className="dot ok" />
          <span>Next.js web app is running.</span>
        </div>
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
