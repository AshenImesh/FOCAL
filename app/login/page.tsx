"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icons";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const supabase = createClient();

  async function googleLogin() {
    if (!supabase) {
      setError("The site is not connected to its database yet (missing env config).");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  if (!supabase) {
    return (
      <div className="auth-wrap">
        <div className="card auth-card">
          <h1>Not configured yet</h1>
          <p className="sub">
            Add the Supabase environment variables (see README.md) and restart to enable Google
            login.
          </p>
          <Link className="btn btn-ghost btn-block" href="/">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          FOCAL students
        </div>
        <h1>Welcome back</h1>
        <p className="sub">
          Log in with your Gmail to see results, take quizzes and check the leaderboard.
        </p>
        {error && <div className="form-error">{error}</div>}
        <button className="google-btn" onClick={googleLogin} disabled={busy}>
          <svg viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1a7.2 7.2 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            />
          </svg>
          {busy ? "Redirecting to Google…" : "Continue with Google"}
        </button>
        <div className="auth-divider">New student?</div>
        <p className="auth-note">
          Just log in with any Gmail — you&apos;ll be asked for your name and grade. The teacher
          approves your registration before paper results are unlocked.{" "}
          <Link href="/board">Peek at the leaderboard</Link> while you wait.
        </p>
      </div>
    </div>
  );
}
