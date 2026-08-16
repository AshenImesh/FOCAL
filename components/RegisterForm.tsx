"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeRegistration } from "@/lib/actions";
import { Icon } from "@/components/icons";

const GRADES = ["6", "7", "8", "9", "10", "11"];

export default function RegisterForm({ defaultName }: { defaultName: string }) {
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!grade) {
      setError("Please pick your grade.");
      return;
    }
    setBusy(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("grade", grade);
    const result = await completeRegistration(formData);
    if (result && "error" in result && result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <div className="field">
        <label htmlFor="full_name">Full name</label>
        <input
          className="input"
          id="full_name"
          name="full_name"
          defaultValue={defaultName}
          placeholder="e.g. Ashan Perera"
          required
        />
      </div>
      <div className="field">
        <label>Your grade</label>
        <div className="chips">
          {GRADES.map((g) => (
            <button
              type="button"
              key={g}
              className={"chip" + (grade === g ? " active" : "")}
              onClick={() => setGrade(g)}
            >
              Grade {g}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="phone">
          Guardian phone <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>(optional)</span>
        </label>
        <input
          className="input"
          id="phone"
          name="phone"
          placeholder="e.g. 07X XXX XXXX"
          autoComplete="tel"
        />
      </div>
      <button className="btn btn-primary btn-block" disabled={busy}>
        <Icon name="check" size={17} /> {busy ? "Saving…" : "Finish registration"}
      </button>
    </form>
  );
}
