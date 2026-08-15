"use client";

import { useMemo, useState } from "react";
import { Ic } from "../components/icons";
import { GRADES } from "@/lib/constants";

type Row = {
  name: string;
  grade: string;
  pct: number;
  score: number;
  total: number;
  date: string;
};

export function BoardView({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(
    () => rows.filter((r) => filter === "all" || r.grade === filter),
    [rows, filter]
  );

  const podium = filtered.slice(0, 3);
  const podiumOrder = [1, 0, 2]; // display 2nd, 1st, 3rd
  const medals = ["🥇", "🥈", "🥉"];
  const rankCls = ["r1", "r2", "r3"];
  const sym = (i: number) => (i < 3 ? medals[i] : `#${i + 1}`);

  return (
    <div className="board-wrap">
      <div className="page-head">
        <span className="eyebrow">Hall of fame</span>
        <h1>Leaderboard</h1>
        <p>Top performers across quizzes — best score per student.</p>
      </div>

      <div className="filter-row">
        <span className="f-label">Filter</span>
        <button
          className={`chip ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All grades
        </button>
        {GRADES.map((g) => (
          <button
            key={g}
            className={`chip ${filter === g ? "active" : ""}`}
            onClick={() => setFilter(g)}
          >
            Grade {g}
          </button>
        ))}
      </div>

      {filtered.length >= 2 && (
        <div className="podium">
          {podiumOrder.map((pos, i) => {
            const item = podium[pos];
            if (!item) return null;
            return (
              <div className={`p-item ${rankCls[pos]}`} key={pos}>
                <div className="p-medal">{medals[pos]}</div>
                <div className="p-name">{item.name}</div>
                <div className="p-grade">Grade {item.grade}</div>
                <div className="p-score">
                  {item.pct}
                  <small>%</small>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card board-card">
        <div className="board-head">
          <div className="board-title">Quiz rankings · best score per student</div>
          <div className="board-count">
            <b>{filtered.length}</b> student{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
        {filtered.length ? (
          <div style={{ overflowX: "auto", padding: "4px 12px 12px" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 52 }}>Rank</th>
                  <th>Student</th>
                  <th>Grade</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={`${r.name}-${r.grade}`}>
                    <td className={`rank ${i < 3 ? rankCls[i] : "rn"}`}>{sym(i)}</td>
                    <td style={{ fontWeight: 600, color: "var(--ink)" }}>{r.name}</td>
                    <td>Grade {r.grade}</td>
                    <td>
                      <div className="pct-cell">
                        <span className="v">{r.pct}%</span>
                        <div className="pbar">
                          <i style={{ width: `${Math.min(100, r.pct)}%` }} />
                        </div>
                        <span style={{ fontSize: ".78rem", color: "var(--faint)" }}>
                          {r.score}/{r.total}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <div className="ic">
              <Ic.bolt size={26} />
            </div>
            <h3>No quiz scores yet</h3>
            <p>Complete a quiz and your best score appears here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
