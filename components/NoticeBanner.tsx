"use client";

import { useState, useEffect, useRef } from "react";
import type { Notice } from "@/lib/types";
import { Icon } from "@/components/icons";

export default function NoticeBanner({ notices }: { notices: Notice[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [anim, setAnim] = useState<"in" | "out">("in");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("focal_notices_dismissed");
      if (saved) setDismissed(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const visible = notices.filter((n) => !dismissed.includes(n.id));
  const item = visible[Math.min(current, Math.max(visible.length - 1, 0))];

  function go(dir: 1 | -1) {
    if (visible.length < 2 || anim === "out") return;
    setAnim("out");
    setTimeout(() => {
      setCurrent((c) => (c + dir + visible.length) % visible.length);
      setAnim("in");
    }, 300);
  }

  useEffect(() => {
    if (visible.length < 2) return;
    timerRef.current = setInterval(() => go(1), 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible.length, anim]);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      sessionStorage.setItem("focal_notices_dismissed", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  if (!item) return null;

  return (
    <div className="notice-bar">
      <div className="nb-in">
        <span className="nb-icon">
          <Icon name="bell" size={18} />
        </span>
        <span className={"nb-slide" + (anim === "out" ? " out" : "")} key={current}>
          <span className="nb-text">
            <b>{item.title}:</b> {item.body}
          </span>
          {visible.length > 1 && (
            <span className="nb-dots">
              {visible.map((n, i) => (
                <button
                  key={n.id}
                  className={"nb-dot" + (i === current ? " active" : "")}
                  aria-label={"Notice " + (i + 1)}
                  onClick={() => {
                    if (anim === "out") return;
                    setAnim("out");
                    setTimeout(() => {
                      setCurrent(i);
                      setAnim("in");
                    }, 300);
                  }}
                />
              ))}
            </span>
          )}
        </span>
        <button
          className="nb-close"
          onClick={() => dismiss(item.id)}
          aria-label="Dismiss notice"
        >
          <Icon name="close" size={13} />
        </button>
      </div>
    </div>
  );
}