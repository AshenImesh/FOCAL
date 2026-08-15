"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleIcon, Ic } from "../components/icons";
import { createClient } from "@/lib/supabase/client";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Let the dashboard / register page decide where to send them.
        router.replace(next);
      }
    });
  }, [router, next]);

  const signIn = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) console.error(error);
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="ic">
          <Ic.lock size={26} />
        </div>
        <h2>Welcome to FOCAL</h2>
        <p>
          Sign in with your Gmail to check results, take quizzes and track your
          progress.
        </p>
        <button className="btn btn-google btn-block" onClick={signIn}>
          <GoogleIcon /> Continue with Google
        </button>
        <p className="reg-note">
          New here? Sign in once — we&apos;ll ask for your name and grade next.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
