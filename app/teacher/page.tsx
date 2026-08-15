import { cookies } from "next/headers";
import { TeacherLogin } from "./teacher-login";
import { TeacherPanel } from "./teacher-panel";
import { teacherCookieName, verifyTeacherToken } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(teacherCookieName())?.value;
  const claims = token ? await verifyTeacherToken(token) : null;

  if (!claims) {
    return (
      <div className="view">
        <div className="page-head center">
          <span className="eyebrow">Staff area</span>
          <h1>Teacher panel</h1>
          <p>For teachers only — credentials are issued by the admin.</p>
        </div>
        <TeacherLogin />
      </div>
    );
  }

  const admin = adminClient();

  const { data: students } = await admin
    .from("students")
    .select("id, name, grade, phone, email")
    .eq("approved", true)
    .order("name")
    .returns<{ id: string; name: string; grade: string; phone: string | null; email: string }[]>();

  const { data: rawResults } = await admin
    .from("results")
    .select("id, paper, marks, total, date, created_at, students(name, grade)")
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<
      {
        id: number;
        paper: string;
        marks: number;
        total: number;
        date: string | null;
        created_at: string;
        students: { name?: string; grade?: string } | null;
      }[]
    >();

  const { data: rawQuiz } = await admin
    .from("quiz_scores")
    .select("id, grade, score, total, pct, created_at, students(name)")
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<
      {
        id: number;
        grade: string;
        score: number;
        total: number;
        pct: number;
        created_at: string;
        students: { name?: string } | null;
      }[]
    >();

  const results = (rawResults ?? []).map((r) => ({
    id: r.id,
    paper: r.paper,
    marks: Number(r.marks),
    total: Number(r.total),
    date: r.date,
    created_at: r.created_at,
    student_name: r.students?.name ?? "Student",
    student_grade: r.students?.grade ?? "",
  }));

  const quizRows = (rawQuiz ?? []).map((q) => ({
    id: q.id,
    grade: q.grade,
    score: q.score,
    total: q.total,
    pct: Number(q.pct),
    created_at: q.created_at,
    student_name: q.students?.name ?? "Student",
  }));

  return (
    <div className="view">
      <TeacherPanel
        students={(students ?? []) as { id: string; name: string; grade: string; phone: string | null; email: string }[]}
        results={results}
        quizRows={quizRows}
        username={claims.user}
      />
    </div>
  );
}
