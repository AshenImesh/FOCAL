"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icons";
import type { Paper, QuizScore, Profile } from "@/lib/types";

const GRADES = ["6", "7", "8", "9", "10", "11"];
const MEDALS = ["🥇", "🥈", "🥉"];

type Row = { name: string; grade: number; val: number; sub: string };

export default function BoardPage() {
  const [tab, setTab] = useState<"quiz" | "paper">("quiz");
  const [grade, setGrade] = useState("all");
  const [quizRows, setQuizRows] = useState<Row[]>([]);
  const [paperRows, setPaperRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const fetchAll = async () => {
      const [q, p, profiles] = await Promise.all([
        supabase.from("quiz_scores").select("*").limit(500),
        supabase.from("papers").select("*").limit(500),
        supabase.from("profiles").select("id, full_name, role"),
      ]);
      const nameOf = new Map<string, string>();
      ((profiles.data || []) as { id: string; full_name: string | null; role: string }[]).forEach((pr) => {
        if (pr.role !== "student") return;
        nameOf.set(pr.id, pr.full_name || "Student");
      });

      const best = new Map<string, QuizScore>();
      (q.data || []).forEach((s: QuizScore) => {
        const k = s.student_id;
        if (!best.has(k) || s.pct > best.get(k)!.pct) best.set(k, s);
      });
      setQuizRows(
        [...best.values()]
          .map((s) => ({
            name: nameOf.get(s.student_id) || "Student",
            grade: s.grade,
            val: s.pct,
            sub: `${s.score}/${s.total}`,
          }))
          .sort((a, b) => b.val - a.val)
      );

      const avg = new Map<string, { sum: number; n: number; grade: number; count: number }>();
      (p.data || []).forEach((pa: Paper) => {
        const cur = avg.get(pa.student_id) || { sum: 0, n: 0, grade: 0, count: 0 };
        cur.sum += (pa.marks / pa.total) * 100;
        cur.n++;
        cur.grade = cur.grade || 0;
        avg.set(pa.student_id, cur);
      });
      setPaperRows(
        [...avg.entries()]
          .map(([sid, v]) => ({
            name: nameOf.get(sid) || "Student",
            grade: v.grade,
            val: Math.round(v.sum / v.n),
            sub: `${v.n} paper${v.n > 1 ? "s" : ""}`,
          }))
          .sort((a, b) => b.val - a.val)
      );
      setLoaded(true);
    };
    fetchAll();
  }, []);

  const rows = (tab === "quiz" ? quizRows : paperRows).filter(
    (r) => grade === "all" || String(r.grade) === grade
  );

  const podium = (arr: Row[]) => {
    if (arr.length < 2) return null;
    const order = [1, 0, 2];
    const cls = ["r2", "r1", "r3"];
    return (
      <div className="podium">
        {order.map((idx, pos) => {
          const item = arr[idx];
          if (!item) return null;
          return (
            <div key={pos} className={"p-item " + cls[pos]}>
              <div className="p-medal">{MEDALS[idx]}</div>
              <div className="p-name">{item.name}</div>
              <div className="p-grade">Grade {item.grade}</div>
              <div className="p-score">
                {item.val}
                <small>%</small>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const table = (arr: Row[]) =>
    arr.length ? (
      <table>
        <thead>
          <tr>
            <th style={{ width: 52 }}>Rank</th>
            <th>Student</th>
            <th>Grade</th>
            <th>Score</th>
            <th>{tab === "quiz" ? "Best" : "Papers"}</th>
          </tr>
        </thead>
        <tbody>
          {arr.map((r, i) => (
            <tr key={i}>
              <td className={"rank " + (i < 3 ? "r" + (i + 1) : "rn")}>
                {i < 3 ? MEDALS[i] : "#" + (i + 1)}
              </td>
              <td style={{ fontWeight: 600, color: "var(--ink)" }}>{r.name}</td>
              <td>Grade {r.grade}</td>
              <td>
                <div className="pct-cell">
                  <span className="v">{r.val}%</span>
                  <div className="pbar">
                    <i style={{ width: Math.min(100, r.val) + "%" }} />
                  </div>
                </div>
              </td>
              <td style={{ color: "var(--faint)" }}>{r.sub}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className="empty">
        <div className="ic">
          <Icon name={tab === "quiz" ? "bolt" : "bars"} size={28} />
        </div>
        <h3>{tab === "quiz" ? "No quiz scores yet" : "No paper data yet"}</h3>
        <p>
          {tab === "quiz"
            ? "Complete a quiz and your best score appears here automatically."
            : "Paper rankings are built from the results the teacher uploads."}
        </p>
        <Link className="btn btn-primary" href="/login" style={{ marginTop: 20 }}>
          <Icon name="bolt" size={17} /> Take a quiz
        </Link>
      </div>
    );

  return (
    <div className="board-wrap">
      <div className="page-head">
        <span className="eyebrow">Hall of fame</span>
        <h1>Leaderboard</h1>
        <p>Top performers across quizzes and class papers.</p>
      </div>

      <div className="tabs">
        <button className={"tab" + (tab === "quiz" ? " active" : "")} onClick={() => setTab("quiz")}>
          <Icon name="bolt" size={15} /> Quiz board
        </button>
        <button className={"tab" + (tab === "paper" ? " active" : "")} onClick={() => setTab("paper")}>
          <Icon name="bars" size={15} /> Paper board
        </button>
      </div>

      <div className="filter-row">
        <span className="f-label">Filter</span>
        <button className={"chip" + (grade === "all" ? " active" : "")} onClick={() => setGrade("all")}>
          All grades
        </button>
        {GRADES.map((g) => (
          <button key={g} className={"chip" + (grade === g ? " active" : "")} onClick={() => setGrade(g)}>
            Grade {g}
          </button>
        ))}
      </div>

      {!loaded ? (
        <div className="empty">
          <p style={{ color: "var(--faint)" }}>Loading…</p>
        </div>
      ) : (
        <>
          {podium(rows)}
          <div className="card board-card">
            <div className="board-head">
              <div className="board-title">
                {tab === "quiz" ? "Quiz rankings · best score per student" : "Paper rankings · average across papers"}
              </div>
              <div className="board-count">
                <b>{rows.length}</b> student{rows.length !== 1 ? "s" : ""}
              </div>
            </div>
            {table(rows)}
          </div>
        </>
      )}
    </div>
  );
}
