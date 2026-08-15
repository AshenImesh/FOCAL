import Link from "next/link";
import { redirect } from "next/navigation";
import { Ic } from "../components/icons";
import { PaperTrendChart, QuizBarChart } from "../components/charts";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, gradeOfPct, initials } from "@/lib/constants";
import type { PaperResult, QuizScore, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const uid = user.id;

  const { data: profile } = await supabase
    .from("students")
    .select("*")
    .eq("id", uid)
    .maybeSingle<Student>();

  if (!profile) redirect("/register");

  const { data: results } = await supabase
    .from("results")
    .select("*")
    .eq("student_id", uid)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .returns<PaperResult[]>();

  const { data: quizScores } = await supabase
    .from("quiz_scores")
    .select("*")
    .eq("student_id", uid)
    .order("created_at", { ascending: false })
    .returns<QuizScore[]>();

  const papers = (results ?? []).map((r) => ({
    ...r,
    pct: Math.round((r.marks / r.total) * 100),
  }));

  if (!profile.approved) {
    return <PendingView profile={profile} />;
  }

  return (
    <div className="view">
      <div className="page-head">
        <span className="eyebrow">My dashboard</span>
        <h1>
          {initials(profile.name)}, your results
        </h1>
        <p>
          Grade {profile.grade} · Science · FOCAL Classes ·{" "}
          <span style={{ color: "var(--faint)" }}>{profile.email}</span>
        </p>
      </div>

      <StatsBar papers={papers} quizScores={quizScores ?? []} />

      <div className="dash-grid">
        <div className="card chart-card">
          <h3>Paper performance & forecast</h3>
          <div className="sub">
            Your paper scores over time, with a projected trend for the next
            papers.
          </div>
          {papers.length >= 2 ? (
            <TrendWithForecast papers={papers} />
          ) : (
            <ChartEmpty
              text="Add at least two paper results to see your trend and forecast."
              href="/quiz"
              cta="Take a quiz instead"
            />
          )}
          <div className="legend-inline">
            <span>
              <span className="dot" style={{ background: "var(--accent)" }} />
              Your score
            </span>
            <span>
              <span className="dot" style={{ background: "var(--accent-2)" }} />
              Forecast
            </span>
          </div>
        </div>

        <div className="card chart-card">
          <h3>Quiz history</h3>
          <div className="sub">Your recent quiz scores at a glance.</div>
          {(quizScores ?? []).length > 0 ? (
            <QuizBarChart
              data={(quizScores ?? [])
                .slice()
                .reverse()
                .slice(-12)
                .map((s) => ({
                  label: fmtDate(s.created_at).slice(0, 6),
                  pct: Math.round(Number(s.pct)),
                }))}
            />
          ) : (
            <ChartEmpty
              text="No quizzes taken yet — try one and your scores will appear here."
              href="/quiz"
              cta="Take a quiz"
            />
          )}
        </div>
      </div>

      <div className="dash-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "22px 24px 0" }}>
            <div className="table-title">Paper breakdown</div>
          </div>
          {papers.length > 0 ? (
            <div style={{ padding: "0 16px 16px", overflowX: "auto" }}>
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
                    const g = gradeOfPct(p.pct);
                    return (
                      <tr key={p.id}>
                        <td>{p.paper}</td>
                        <td style={{ color: "var(--faint)" }}>{p.date || fmtDate(p.created_at)}</td>
                        <td>
                          {p.marks} / {p.total}
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--ink)" }}>
                          {p.pct}%
                        </td>
                        <td>
                          <span className={`badge ${g.cls}`}>{g.letter}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyMini text="No paper results uploaded yet — they will appear here once your teacher posts them." />
          )}
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "22px 24px 0" }}>
            <div className="table-title">Quiz history</div>
          </div>
          {(quizScores ?? []).length > 0 ? (
            <div style={{ padding: "0 16px 16px", overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Grade</th>
                    <th>Score</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {(quizScores ?? []).slice(0, 12).map((s) => (
                    <tr key={s.id}>
                      <td>{fmtDate(s.created_at)}</td>
                      <td style={{ color: "var(--faint)" }}>Grade {s.grade}</td>
                      <td>
                        {s.score} / {s.total}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--ink)" }}>
                        {Math.round(Number(s.pct))}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyMini text="Quizzes you take will show up here with dates and scores." />
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
        <Link className="btn btn-primary" href="/quiz">
          <Ic.bolt size={16} /> Take a quiz
        </Link>
        <Link className="btn btn-ghost" href="/board">
          <Ic.trophy size={16} /> View leaderboard
        </Link>
      </div>
    </div>
  );
}

function StatsBar({
  papers,
  quizScores,
}: {
  papers: { pct: number }[];
  quizScores: QuizScore[];
}) {
  const totalMarks = papers.reduce((s, p) => s + p.pct, 0);
  const avg = papers.length ? Math.round(totalMarks / papers.length) : 0;
  const best = papers.length ? Math.max(...papers.map((p) => p.pct)) : 0;
  const quizBest = quizScores.length
    ? Math.round(Math.max(...quizScores.map((s) => Number(s.pct))))
    : 0;

  const trend =
    papers.length >= 3 ? trendInfo(papers.map((p) => p.pct)) : null;

  return (
    <div className="dash-grid">
      <div className="card stat-card">
        <div className="ic">
          <Ic.bars size={18} />
        </div>
        <div className="n">{papers.length}</div>
        <div className="l">Papers on record</div>
      </div>
      <div className="card stat-card">
        <div className="ic">
          <Ic.chart size={18} />
        </div>
        <div className="n accent">{avg}%</div>
        <div className="l">Average score</div>
        {trend && (
          <span className={`trend ${trend.dir}`}>
            {trend.dir === "up" ? "↑" : "↓"} {trend.delta > 0 ? "+" : ""}
            {trend.delta}%
          </span>
        )}
      </div>
      <div className="card stat-card">
        <div className="ic">
          <Ic.trophy size={18} />
        </div>
        <div className="n good">{best}%</div>
        <div className="l">Best paper</div>
      </div>
      <div className="card stat-card">
        <div className="ic">
          <Ic.bolt size={18} />
        </div>
        <div className="n warn">{quizBest}%</div>
        <div className="l">Best quiz · {quizScores.length} taken</div>
      </div>
    </div>
  );
}

function trendInfo(values: number[]): { dir: "up" | "down"; delta: number } {
  const n = values.length;
  const first = values[0];
  const last = values[n - 1];
  const delta = last - first;
  return { dir: delta >= 0 ? "up" : "down", delta: Math.abs(delta) };
}

function TrendWithForecast({ papers }: { papers: { paper: string; pct: number }[] }) {
  const actuals = papers.map((p, i) => ({
    label: p.paper.length > 14 ? p.paper.slice(0, 14) + "…" : p.paper,
    pct: p.pct,
  }));
  const forecasts = linearForecast(papers.map((p) => p.pct), 2).map((v, i) => ({
    label: `Next #${i + 1}`,
    pct: v,
  }));

  return <PaperTrendChart actuals={actuals} forecasts={forecasts} />;
}

function linearForecast(values: number[], steps: number): number[] {
  const n = values.length;
  if (n < 2) return values.map(() => 50);
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  values.forEach((y, x) => {
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  });
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
  const a = (sy - b * sx) / n;
  const out: number[] = [];
  for (let i = 1; i <= steps; i++) {
    const v = a + b * (n - 1 + i);
    out.push(Math.round(Math.max(0, Math.min(100, v))));
  }
  return out;
}

function PendingView({ profile }: { profile: Student }) {
  return (
    <div className="view">
      <div className="page-head center">
        <span className="eyebrow">Welcome to FOCAL</span>
        <h1>Hi {initials(profile.name)}</h1>
      </div>
      <div className="card pending-card">
        <div className="ic">
          <Ic.clock size={28} />
        </div>
        <h3>Your registration is pending approval</h3>
        <p>
          Thanks for signing up, {profile.name}. Your teacher will confirm your
          registration shortly. Once approved, your paper results will unlock
          here.
        </p>
        <Link className="btn btn-primary" href="/quiz">
          <Ic.bolt size={16} /> Take a quiz while you wait
        </Link>
      </div>
    </div>
  );
}

function ChartEmpty({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="empty" style={{ padding: "28px 16px" }}>
      <div className="ic">
        <Ic.chart size={26} />
      </div>
      <h3 style={{ fontSize: "1rem" }}>Nothing to chart yet</h3>
      <p style={{ fontSize: ".82rem" }}>{text}</p>
      <Link className="btn btn-soft btn-sm" href={href} style={{ marginTop: 16 }}>
        {cta}
      </Link>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <p style={{ fontSize: ".84rem", color: "var(--faint)", padding: "12px 24px 24px" }}>
      {text}
    </p>
  );
}
