"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/actions";
import { Icon } from "@/components/icons";

export default function LogoutButton({
  label = "Sign out",
  className = "icon-btn",
  title = "Log out",
  style,
}: {
  label?: string;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function confirm() {
    setBusy(true);
    await logoutUser();
    setBusy(false);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button className={className} title={title} style={style} onClick={() => setOpen(true)}>
        <Icon name="logout" size={15} /> {label}
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-ic">
              <Icon name="logout" size={22} />
            </div>
            <h3>Log out?</h3>
            <p>You&apos;ll need to sign in with Google again to see your results.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirm} disabled={busy}>
                {busy ? "Logging out…" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}