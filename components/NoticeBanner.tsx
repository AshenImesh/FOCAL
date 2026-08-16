"use client";

import { useState, useEffect } from "react";
import type { Notice } from "@/lib/types";
import { Icon } from "@/components/icons";

export default function NoticeBanner({ notices }: { notices: Notice[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("focal_notices_dismissed");
      if (saved) setDismissed(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const visible = notices.filter((n) => !dismissed.includes(n.id));
  if (!visible.length) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      sessionStorage.setItem("focal_notices_dismissed", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="notice-bar">
      <div className="nb-in">
        <span className="nb-icon">
          <Icon name="bell" size={18} />
        </span>
        <span>
          {visible.map((n) => (
            <span key={n.id}>
              <b>{n.title}:</b> {n.body}
            </span>
          ))}
        </span>
        <button
          className="nb-close"
          onClick={() => visible.forEach((n) => dismiss(n.id))}
          aria-label="Dismiss notices"
        >
          <Icon name="close" size={13} />
        </button>
      </div>
    </div>
  );
}
