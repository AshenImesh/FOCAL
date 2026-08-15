import { redirect } from "next/navigation";
import { BoardView } from "./board-view";
import { createClient } from "@/lib/supabase/server";
import type { QuizScore, Student } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/board");

  const { data: scores } = await supabase
    .from("quiz_scores")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<QuizScore[]>();

  const { data: students } = await supabase
    .from("students")
    .select("id, name")
    .returns<Pick<Student, "id" | "name">[]>();

  const nameOf = new Map((students ?? []).map((s) => [s.id, s.name]));

  // best score per student per grade
  const best = new Map<string, QuizScore>();
  for (const s of scores ?? []) {
    const k = `${s.student_id}|${s.grade}`;
    const cur = best.get(k);
    if (!cur || Number(s.pct) > Number(cur.pct)) best.set(k, s);
  }

  const rows = [...best.values()]
    .map((s) => ({
      name: nameOf.get(s.student_id) || "Student",
      grade: s.grade,
      pct: Math.round(Number(s.pct)),
      score: s.score,
      total: s.total,
      date: s.created_at,
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="view">
      <BoardView rows={rows} />
    </div>
  );
}
