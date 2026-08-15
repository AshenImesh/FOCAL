import { AdminGate } from "./admin-gate";
import { AdminPanel } from "./admin-panel";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="view">
        <AdminGate signedIn={false} />
      </div>
    );
  }

  if (!(await isAdminUser(user.email))) {
    return (
      <div className="view">
        <AdminGate signedIn={true} />
      </div>
    );
  }

  const admin = adminClient();

  const { data: students } = await admin
    .from("students")
    .select("id, email, name, grade, phone, approved, created_at")
    .order("created_at", { ascending: false })
    .returns<{
      id: string;
      email: string;
      name: string;
      grade: string;
      phone: string | null;
      approved: boolean;
      created_at: string;
    }[]>();

  const { data: teachers } = await admin
    .from("teachers")
    .select("id, name, username, created_at")
    .order("created_at", { ascending: false })
    .returns<{ id: number; name: string; username: string; created_at: string }[]>();

  const { data: notices } = await admin
    .from("notices")
    .select("id, message, active, created_at")
    .order("created_at", { ascending: false })
    .returns<{ id: number; message: string; active: boolean; created_at: string }[]>();

  const { data: rawResults } = await admin
    .from("results")
    .select("id, paper, marks, total, date, created_at, student_id, students(name, grade)")
    .order("created_at", { ascending: false })
    .limit(80)
    .returns<
      {
        id: number;
        paper: string;
        marks: number;
        total: number;
        date: string | null;
        created_at: string;
        student_id: string;
        students: { name?: string; grade?: string } | null;
      }[]
    >();

  const { data: rawQuiz } = await admin
    .from("quiz_scores")
    .select("id, grade, score, total, pct, created_at, students(name)")
    .order("created_at", { ascending: false })
    .limit(60)
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

  const { data: admins } = await admin
    .from("admins")
    .select("id, email, created_at")
    .order("created_at", { ascending: true })
    .returns<{ id: number; email: string; created_at: string }[]>();

  const ownerEmail = process.env.ADMIN_EMAIL || "";

  const results = (rawResults ?? []).map((r) => ({
    id: r.id,
    paper: r.paper,
    marks: Number(r.marks),
    total: Number(r.total),
    date: r.date,
    created_at: r.created_at,
    student_id: r.student_id,
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
      <AdminPanel
        students={(students ?? []) as { id: string; email: string; name: string; grade: string; phone: string | null; approved: boolean; created_at: string }[]}
        teachers={(teachers ?? []) as { id: number; name: string; username: string; created_at: string }[]}
        notices={(notices ?? []) as { id: number; message: string; active: boolean; created_at: string }[]}
        results={results}
        quizRows={quizRows}
        admins={(admins ?? []) as { id: number; email: string; created_at: string }[]}
        ownerEmail={ownerEmail}
      />
    </div>
  );
}
