"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, submitChangeRequest } from "@/lib/actions";
import { Icon } from "@/components/icons";
import type { Profile, UserRequest } from "@/lib/types";

const GRADES = ["6", "7", "8", "9", "10", "11"];

function toast(msg: string) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}

export default function ProfileForm({
  profile,
  email,
  requests,
}: {
  profile: Profile;
  email: string;
  requests: UserRequest[];
}) {
  const router = useRouter();
  const [name, setName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<null | "email" | "grade">(null);
  const [reqVal, setReqVal] = useState("");
  const [reqBusy, setReqBusy] = useState(false);
  const [reqErr, setReqErr] = useState("");

  const pendingEmail = requests.find((r) => r.kind === "email" && r.status === "pending");
  const pendingGrade = requests.find((r) => r.kind === "grade" && r.status === "pending");

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

  async function sendAppeal() {
    if (!modal) return;
    setReqBusy(true);
    setReqErr("");
    const res = await submitChangeRequest({ kind: modal, value: reqVal });
    setReqBusy(false);
    if (res && "error" in res && res.error) {
      setReqErr(res.error);
      return;
    }
    setModal(null);
    setReqVal("");
    toast(modal === "email" ? "Appeal sent — waiting for the teacher." : "Appeal sent — waiting for the teacher.");
    router.refresh();
  }

  return (
    <div>
      <div className="field">
        <label>Name</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
        />
      </div>
      <div className="field">
        <label>Phone</label>
        <input
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 07X XXX XXXX"
        />
      </div>

      <div className="field">
        <label>Sign-in email</label>
        <div className="profile-row">
          <div>
            <div className="v">{email}</div>
            <div className="k">Your Gmail — can&apos;t be edited here</div>
          </div>
          {pendingEmail ? (
            <span className="req-badge">
              <Icon name="clock" size={12} /> Awaiting approval
            </span>
          ) : (
            <button className="btn btn-soft btn-sm" onClick={() => setModal("email")}>
              Change
            </button>
          )}
        </div>
      </div>

      <div className="field">
        <label>Grade</label>
        <div className="profile-row">
          <div>
            <div className="v">Grade {profile.grade ?? "—"}</div>
            <div className="k">Quizzes and the leaderboard follow this</div>
          </div>
          {pendingGrade ? (
            <span className="req-badge">
              <Icon name="clock" size={12} /> Awaiting approval
            </span>
          ) : (
            <button className="btn btn-soft btn-sm" onClick={() => setModal("grade")}>
              Change
            </button>
          )}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <button className="btn btn-primary btn-block" onClick={save} disabled={busy || !name.trim()}>
        {busy ? "Saving…" : "Save changes"}
      </button>

      {modal && (
        <div className="modal-overlay" onClick={() => !reqBusy && setModal(null)}>
          <div className="modal-card" style={{ textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ textAlign: "center" }}>
              {modal === "email" ? "Change your Gmail" : "Change your grade"}
            </h3>
            <p style={{ textAlign: "center", marginTop: 4 }}>
              Your request goes to the teacher — nothing is lost when the change is approved.
            </p>
            {modal === "email" ? (
              <div className="field" style={{ marginTop: 18 }}>
                <label>New email address</label>
                <input
                  className="input"
                  value={reqVal}
                  onChange={(e) => setReqVal(e.target.value)}
                  placeholder="new.email@gmail.com"
                />
              </div>
            ) : (
              <div className="field" style={{ marginTop: 18 }}>
                <label>New grade</label>
                <div className="chips">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      className={"chip" + (reqVal === g ? " active" : "")}
                      onClick={() => setReqVal(g)}
                    >
                      Grade {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {reqErr && <div className="form-error">{reqErr}</div>}
            <div className="modal-actions" style={{ marginTop: 22 }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={reqBusy}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={sendAppeal}
                disabled={reqBusy || !reqVal.trim()}
              >
                {reqBusy ? "Sending…" : "Appeal to teacher"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}