"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { teacherLogin } from "@/lib/actions";
import { Icon } from "@/components/icons";

export default function TeacherLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await teacherLogin(new FormData(e.currentTarget));
    setBusy(false);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="admin-wrap">
      <div className="card gate-card">
        <div className="ic">
          <Icon name="lock" size={26} />
        </div>
        <h2>Teacher panel</h2>
        <p>Sign in with the username and password given to you by the admin.</p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field" style={{ textAlign: "left" }}>
            <label htmlFor="username">Username</label>
            <input className="input" id="username" name="username" autoComplete="username" required />
          </div>
          <div className="field" style={{ textAlign: "left" }}>
            <label htmlFor="password">Password</label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            <Icon name="lock" size={16} /> {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
