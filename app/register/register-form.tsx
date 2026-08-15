"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "../components/icons";
import { useToast } from "../components/toast";
import { registerStudent } from "@/lib/actions";
import { GRADES } from "@/lib/constants";

export function RegisterForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(name);
  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!fullName.trim()) return toast("Please enter your name");
    if (!grade) return toast("Please pick your grade");
    setBusy(true);
    const res = await registerStudent({ name: fullName, grade, phone });
    setBusy(false);
    if (!res.ok) {
      return toast(res.error || "Could not register");
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card" style={{ textAlign: "left" }}>
        <div style={{ textAlign: "center" }}>
          <div className="ic" style={{ margin: "0 auto 18px" }}>
            <Ic.user size={26} />
          </div>
          <h2 style={{ textAlign: "center" }}>Complete your registration</h2>
          <p style={{ textAlign: "center", marginBottom: 24 }}>
            Signed in as <b style={{ color: "var(--ink)" }}>{email}</b>. Tell us
            a little about you — your request will be approved by your teacher.
          </p>
        </div>

        <div className="field">
          <label htmlFor="reg-name">Full name</label>
          <input
            id="reg-name"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Ashan Perera"
            autoComplete="name"
          />
        </div>

        <div className="field">
          <label>Your grade</label>
          <div className="chips">
            {GRADES.map((g) => (
              <button
                type="button"
                key={g}
                className={`chip ${grade === g ? "active" : ""}`}
                onClick={() => setGrade(g)}
              >
                Grade {g}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="reg-phone">
            Phone number{" "}
            <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--faint)" }}>
              (optional — so the teacher can contact you)
            </span>
          </label>
          <input
            id="reg-phone"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 07X XXX XXXX"
            autoComplete="tel"
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          onClick={submit}
          disabled={busy}
        >
          <Ic.check size={17} /> {busy ? "Registering…" : "Register me"}
        </button>
        <p className="reg-note">
          Once your teacher approves your registration you&apos;ll be able to see
          paper results. You can still take quizzes right away.
        </p>
      </div>
    </div>
  );
}
