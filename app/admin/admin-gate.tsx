"use client";

import { GoogleIcon, Ic } from "../components/icons";
import { createClient } from "@/lib/supabase/client";

export function AdminGate({ signedIn }: { signedIn: boolean }) {
  const signIn = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/admin")}`,
      },
    });
    if (error) console.error(error);
  };

  return (
    <div className="view">
      <div className="page-head center">
        <span className="eyebrow">Control panel</span>
        <h1>Admin</h1>
      </div>
      <div className="card gate-card">
        <div className="ic">
          <Ic.shield size={26} />
        </div>
        {signedIn ? (
          <>
            <h2>Access restricted</h2>
            <p>
              This control panel is only available to admin accounts. You are
              signed in with a different Gmail.
            </p>
          </>
        ) : (
          <>
            <h2>Admin access</h2>
            <p>
              Sign in with the admin Gmail account to manage registrations,
              results, teachers and notices.
            </p>
            <button className="btn btn-google btn-block" onClick={signIn}>
              <GoogleIcon /> Continue with Google
            </button>
            <p className="reg-note">
              Only the admin email(s) set up in the control panel can enter.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
