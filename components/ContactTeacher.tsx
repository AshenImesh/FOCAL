"use client";

import { useState } from "react";
import { submitContactRequest } from "@/lib/actions";
import { Icon } from "@/components/icons";

function toast(msg: string) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}

export default function ContactTeacher() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function send() {
    setBusy(true);
    setErr("");
    const res = await submitContactRequest({ name, phone, message });
    setBusy(false);
    if (res && "error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setDone(true);
    toast("Message sent — the teacher will get back to you.");
    setTimeout(() => {
      setOpen(false);
      setDone(false);
      setName("");
      setPhone("");
      setMessage("");
    }, 1400);
  }

  return (
    <>
      <button className="btn btn-primary btn-block" onClick={() => setOpen(true)}>
        <Icon name="edit" size={16} /> Contact teacher
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="modal-card" style={{ textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div style={{ textAlign: "center", padding: "18px 0 8px" }}>
                <div className="modal-ic" style={{ background: "var(--good-soft)", color: "var(--good)" }}>
                  <Icon name="check" size={24} />
                </div>
                <h3 style={{ marginTop: 4 }}>Message sent</h3>
                <p style={{ marginTop: 4 }}>The teacher will contact you soon.</p>
              </div>
            ) : (
              <>
                <h3 style={{ textAlign: "center" }}>Contact the teacher</h3>
                <p style={{ textAlign: "center", marginTop: 4 }}>
                  Leave a short message and your number — you&apos;ll get a reply.
                </p>
                <div className="field" style={{ marginTop: 16 }}>
                  <label>Your name (optional)</label>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sanduni Perera"
                  />
                </div>
                <div className="field">
                  <label>Phone number</label>
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 07X XXX XXXX"
                  />
                </div>
                <div className="field">
                  <label>Message</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Interested in O/L science individual classes…"
                  />
                </div>
                {err && <div className="form-error">{err}</div>}
                <div className="modal-actions" style={{ marginTop: 18 }}>
                  <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={send}
                    disabled={busy || !phone.trim() || !message.trim()}
                  >
                    {busy ? "Sending…" : "Send message"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}