"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "../components/icons";
import { useToast } from "../components/toast";
import { teacherLogin } from "@/lib/actions";

export function TeacherLogin() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await teacherLogin(username, password);
    setBusy(false);
    if (!res.ok) return toast(res.error || "Login failed");
    router.refresh();
  };

  return (
    <div className="auth-wrap">
      <div className="card gate-card">
        <div className="ic">
          <Ic.lock size={26} />
        </div>
        <h2>Teacher panel</h2>
        <p>
          Sign in with the username and password provided by the admin. No
          self-registration.
        </p>
        <div className="field" style={{ textAlign: "left" }}>
          <label htmlFor="t-user">Username</label>
          <input
            id="t-user"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. mr.perera"
            autoComplete="username"
          />
        </div>
        <div className="field" style={{ textAlign: "left" }}>
          <label htmlFor="t-pass">Password</label>
          <input
            id="t-pass"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
          <Ic.shield size={16} /> {busy ? "Signing in…" : "Unlock panel"}
        </button>
        <p className="reg-note">Forgot your credentials? Ask the admin to reset them.</p>
      </div>
    </div>
  );
}
