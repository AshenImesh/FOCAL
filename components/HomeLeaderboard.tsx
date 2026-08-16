import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import type { QuizScore } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function HomeLeaderboard() {
  const supabase = await createClient();
  if (!supabase) return null;

  const [qRes, pRes] = await Promise.all([
    supabase.from("quiz_scores").select("student_id, grade, score, total, pct").limit(300),
    supabase.from("profiles").select("id, full_name, role").limit(500),
  ]);

  const nameOf = new Map<string, string>();
  ((pRes.data || []) as { id: string; full_name: string | null; role: string }[]).forEach((pr) => {
    if (pr.role !== "student") return;
    nameOf.set(pr.id, pr.full_name || "Student");
  });

  const best = new Map<string, QuizScore>();
  ((qRes.data || []) as QuizScore[]).forEach((s) => {
    const cur = best.get(s.student_id);
    if (!cur || s.pct > cur.pct) best.set(s.student_id, s);
  });

  const rows = [...best.values()]
    .map((s) => ({
      name: nameOf.get(s.student_id) || "Student",
      grade: s.grade,
      val: s.pct,
      sub: `${s.score}/${s.total}`,
    }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 5);

  if (!rows.length) return null;

  return (
    <section className="section-tight">
      <div className="sec-head">
        <span className="eyebrow">Quiz hall of fame</span>
        <h2>This week&apos;s top scorers</h2>
        <p>Best quiz score per student — think you can top the board?</p>
      </div>

      <div className="card board-card home-leader">
        <div className="board-head">
          <div className="board-title">Quiz rankings · best score per student</div>
          <Link className="board-count" href="/board">
            <b>Full leaderboard →</b>
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 52 }}>Rank</th>
              <th>Student</th>
              <th>Grade</th>
              <th>Best score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: "center", marginTop: 26 }}>
        <Link className="btn btn-primary" href="/quiz">
          <Icon name="bolt" size={17} /> Take a quiz
        </Link>
      </div>
    </section>
  );
}