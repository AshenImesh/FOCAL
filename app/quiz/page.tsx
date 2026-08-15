import { redirect } from "next/navigation";
import { QuizRunner } from "./quiz-runner";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/quiz");

  const { data: profile } = await supabase
    .from("students")
    .select("id, name")
    .eq("id", user.id)
    .maybeSingle<{ id: string; name: string }>();

  if (!profile) redirect("/register");

  return (
    <div className="view">
      <QuizRunner userId={profile.id} name={profile.name} />
    </div>
  );
}
