"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions";
import { Icon } from "@/components/icons";
import type { Profile } from "@/lib/types";

function toast(msg: string) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}

export default function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    const res = await updateProfile({ full_name: name, phone });
    setBusy(false);
    if (res && "error" in res && res.error) {
      setError(res.error);
      return;
    }
    toast("Profile saved");
    router.refresh();
  }

  return (
    <div>
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
      </div>
      <div className="field">
        <label>Phone (optional)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 07X XXX XXXX"
        />
      </div>
      <div className="field">
        <label>Sign-in email</label>
        <div className="readonly-row">
          <span>{email}</span>
          <span className="readonly-note">
            <Icon name="lock" size={12} /> Can&apos;t be changed
          </span>
        </div>
      </div>

      <div className="profile-meta">
        <span className="badge badge-b">Grade {profile.grade ?? "—"}</span>
        <span className="badge badge-a">Science</span>
        <span className="badge badge-c">{profile.role}</span>
      </div>

      {error && <div className="form-error">{error}</div>}

      <button className="btn btn-primary btn-block" onClick={save} disabled={busy || !name.trim()}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}