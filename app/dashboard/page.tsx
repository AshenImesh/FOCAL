import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PaperTrendChart, QuizTrendChart } from "@/components/StudentCharts";
import { predict, paperRows, toPct } from "@/lib/predict";
import { Icon } from "@/components/icons";
import type { Paper, Profile, QuizScore } from "@/lib/types";

function gradeBadge(pct: number) {
  if (pct >= 75) return { l: "A", c: "badge-a" };
  if (pct >= 60) return { l: "B", c: "badge-b" };
  if (pct >= 40) return { l: "C", c: "badge-c" };
  return { l: "D", c: "badge-d" };
}

const trendText = {
  improving: { t: "improving", c: "trend-up", txt: "You're improving" },
  steady: { t: "steady", c: "trend-steady", txt: "Holding steady" },
  declining: { t: "declining", c: "trend-down", txt: "Needs a boost" },
} as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as Profile | null;
  if (!profile) redirect("/register");
  if (profile.role === "admin") redirect("/admin");
  if (profile.role === "teacher") redirect("/teacher");
  if (!profile.grade) redirect("/register");

  const approved = profile.status === "approved";

  const [{ data: papersData }, { data: scoresData }, { data: qCountData }] = await Promise.all([
    approved
      ? supabase.from("papers").select("*").eq("student_id", user.id).order("created_at")
      : Promise.resolve({ data: [] as Paper[] }),
    supabase.from("quiz_scores").select("*").eq("student_id", user.id).order("created_at"),
    supabase.from("quiz_questions").select("id").eq("grade", profile.grade),
  ]);

  const papers = paperRows(papersData || []);
  const scores = (scoresData || []) as QuizScore[];
  const pred = predict(papers);
  const quizPacks = Math.floor((qCountData || []).length / 10);

  const totalMarks = papers.reduce((s, p) => s + p.marks, 0);
  const totalMax = papers.reduce((s, p) => s + p.total, 0);
  const avgPaper = papers.length ? Math.round((totalMarks / totalMax) * 100) : 0;
  const bestPaper = papers.length ? Math.max(...papers.map((p) => p.pct)) : 0;
  const bestQuiz = scores.length ? Math.max(...scores.map((s) => s.pct)) : 0;
  const avgQuiz = scores.length ? Math.round(scores.reduce((s, q) => s + q.pct, 0) / scores.length) : 0;

  // top performers in the student's grade (quiz best score per student)
  let topPerformers: { name: string; pct: number; isYou: boolean }[] = [];
  if (profile.grade) {
    const [qRes, pRes] = await Promise.all([
      supabase.from("quiz_scores").select("student_id, pct").eq("grade", profile.grade).limit(500),
      supabase.from("profiles").select("id, full_name, role").limit(500),
    ]);
    const nameOf = new Map<string, string>();
    ((pRes.data || []) as { id: string; full_name: string | null; role: string }[]).forEach((pr) => {
      if (pr.role !== "student") return;
      nameOf.set(pr.id, pr.full_name || "Student");
    });
    const best = new Map<string, number>();
    ((qRes.data || []) as QuizScore[]).forEach((s) => {
      const cur = best.get(s.student_id);
      if (cur == null || s.pct > cur) best.set(s.student_id, s.pct);
    });
    topPerformers = [...best.entries()]
      .map(([sid, pct]) => ({ name: nameOf.get(sid) || "Student", pct, isYou: sid === user.id }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }

  return (
    <div className="wrap" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <span className="eyebrow">My dashboard</span>
        <h1>Welcome, {profile.full_name?.split(" ")[0]}</h1>
        <p>
          Grade {profile.grade} · Science · FOCAL Classes
        </p>
      </div>

      <div className="card quiz-cta">
        <div className="quiz-cta-ic">
          <Icon name="bolt" size={22} />
        </div>
        <div className="quiz-cta-tx">
          <div className="quiz-cta-t">Quizzes for Grade {profile.grade}</div>
          <div className="quiz-cta-s">
            {quizPacks > 0
              ? `${quizPacks} quiz pack${quizPacks !== 1 ? "s" : ""} released${
                  scores.length > 0 ? " · you've taken " + scores.length + " so far" : " · take your first one"
                } — new questions drop regularly.`
              : "The teacher hasn't released quizzes for your grade yet — check back soon."}
          </div>
        </div>
        {quizPacks > 0 && (
          <Link className="btn btn-primary quiz-cta-btn" href="/quiz">
            <Icon name="bolt" size={16} /> Take a quiz
          </Link>
        )}
      </div>

      {!approved && (
        <div className={"status-banner " + (profile.status === "rejected" ? "rejected" : "pending")}>
          <Icon name={profile.status === "rejected" ? "warn" : "clock"} size={20} />
          <span>
            {profile.status === "rejected"
              ? "Your registration was not approved. Please talk to your teacher if this is a mistake."
              : "Your registration is waiting for approval by the teacher. You can take quizzes and see quiz results now — paper results unlock once you're approved."}
          </span>
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi">
          <div className="n accent">{papers.length ? `${avgPaper}%` : "—"}</div>
          <div className="l">Paper average</div>
        </div>
        <div className="kpi">
          <div className="n good">{papers.length ? `${bestPaper}%` : "—"}</div>
          <div className="l">Best paper</div>
        </div>
        <div className="kpi">
          <div className="n">{scores.length}</div>
          <div className="l">Quizzes taken</div>
        </div>
        <div className="kpi">
          <div className="n accent">{scores.length ? `${bestQuiz}%` : "—"}</div>
          <div className="l">Best quiz</div>
        </div>
        <div className="kpi">
          <div className="n">{papers.length + scores.length}</div>
          <div className="l">Total records</div>
        </div>
      </div>

      {topPerformers.length > 0 && (
        <div className="card panel">
          <div className="panel-head">
            <div className="panel-title">Grade {profile.grade} — top performers</div>
            <span className="board-count">quiz best score · rank among your grade</span>
          </div>
          <div style={{ padding: "16px 20px 20px" }}>
            <div className="compare-list">
              {topPerformers.map((p, i) => {
                const youRow = p.isYou;
                const rank = i + 1;
                return (
                  <div className={"cmp-row" + (youRow ? " you" : "")} key={i}>
                    <div className={"cmp-rank" + (rank <= 3 ? " r" + rank : "")}>
                      {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : "#" + rank}
                    </div>
                    <div className="cmp-name">
                      {p.name}
                      {youRow && <span className="cmp-you">You</span>}
                    </div>
                    <div className="cmp-bar">
                      <div className="pbar">
                        <i style={{ width: Math.min(100, p.pct) + "%" }} />
                      </div>
                    </div>
                    <div className="cmp-val">{p.pct}%</div>
                  </div>
                );
              })}
            </div>
            {bestQuiz > 0 && (
              <p className="cmp-note">
                Your best quiz score is <b style={{ color: "var(--accent)" }}>{bestQuiz}%</b>
                {topPerformers.length && topPerformers[0] ? (
                  <>
                    {" "}
                    vs the grade leader&apos;s{" "}
                    <b style={{ color: "var(--accent)" }}>{topPerformers[0].pct}%</b>. Keep
                    going!
                  </>
                ) : null}
              </p>
            )}
          </div>
        </div>
      )}

      {approved && papers.length > 0 && (
        <>
          <div className="card panel">
            <div className="panel-head">
              <div className="panel-title">Paper performance &amp; prediction</div>
              {pred && (
                <span className={"trend-" + trendText[pred.trend].t}>
                  {trendText[pred.trend].txt}
                </span>
              )}
            </div>
            <div className="panel-body">
              <PaperTrendChart
                data={papers.map((p) => ({ label: p.date || p.paper_name.slice(0, 8), pct: p.pct }))}
                predicted={pred?.predicted ?? null}
              />
              {pred && (
                <div className="pred-card" style={{ marginTop: 18 }}>
                  <div className="pc-big">{pred.predicted}%</div>
                  <div className="pc-txt">
                    <b>Projected next paper.</b> Based on your {papers.length} papers so far, you&apos;re
                    likely to score around <b>{pred.predicted}%</b> next time —{" "}
                    <span className={"trend-" + trendText[pred.trend].t}>
                      {trendText[pred.trend].txt.toLowerCase()}
                    </span>
                    {pred.trend === "improving" ? " — keep it up!" : pred.trend === "declining" ? " — a little revision will fix this." : " — consistent work pays off."}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card panel">
            <div className="panel-head">
              <div className="panel-title">Paper history</div>
              <span className="board-count">
                <b>{papers.length}</b> paper{papers.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ padding: "12px 16px 18px", overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Paper</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>%</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map((p) => {
                    const g = gradeBadge(p.pct);
                    return (
                      <tr key={p.id}>
                        <td>{p.paper_name}</td>
                        <td>{p.date || "—"}</td>
                        <td>
                          {p.marks} / {p.total}
                        </td>
                        <td>{p.pct}%</td>
                        <td>
                          <span className={"badge " + g.c}>{g.l}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {approved && papers.length === 0 && (
        <div className="card empty">
          <div className="ic">
            <Icon name="bars" size={28} />
          </div>
          <h3>No papers on record yet</h3>
          <p>Your teacher will upload your paper results here after each test.</p>
        </div>
      )}

      <div className="card panel">
        <div className="panel-head">
          <div className="panel-title">Quiz history</div>
          <span className="board-count">
            <b>{scores.length}</b> attempt{scores.length !== 1 ? "s" : ""} · best {avgQuiz}%
          </span>
        </div>
        {scores.length > 0 ? (
          <div className="panel-body">
            <QuizTrendChart
              data={scores.map((s, i) => ({ label: "Q" + (i + 1), pct: s.pct }))}
            />
            <table style={{ marginTop: 18 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Grade</th>
                  <th>Score</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {[...scores].reverse().map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.created_at).toLocaleDateString("en-GB")}</td>
                    <td>Grade {s.grade}</td>
                    <td>
                      {s.score} / {s.total}
                    </td>
                    <td>{s.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <div className="ic">
              <Icon name="bolt" size={28} />
            </div>
            <h3>No quizzes yet</h3>
            <p>Take your first quiz — it takes about five minutes.</p>
            <Link className="btn btn-primary" href="/quiz" style={{ marginTop: 20 }}>
              <Icon name="bolt" size={17} /> Take a quiz
            </Link>
          </div>
        )}
      </div>

      {!approved && (
        <div className="hint">
          <b>Teacher:</b> paper results appear here once your registration is approved.
        </div>
      )}
    </div>
  );
}
