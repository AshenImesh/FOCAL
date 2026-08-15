"use client";

import { useEffect, useState } from "react";
import { Ic } from "./icons";

export function NoticeBanner({ notices }: { notices: string[] }) {
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("focal_hidden_notices");
      setHidden(raw ? JSON.parse(raw) : []);
    } catch {
      setHidden([]);
    }
  }, []);

  const visible = notices.filter((n) => !hidden.includes(n));
  if (visible.length === 0) return null;

  const dismiss = (n: string) => {
    const next = [...hidden, n];
    setHidden(next);
    try {
      localStorage.setItem("focal_hidden_notices", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="notice-strip" role="region" aria-label="Notice">
      {visible.map((n) => (
        <div className="notice-inner" key={n}>
          <Ic.bell size={16} />
          <span>{n}</span>
          <button
            className="notice-close"
            aria-label="Dismiss notice"
            onClick={() => dismiss(n)}
          >
            <Ic.x size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
