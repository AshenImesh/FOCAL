import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuizPlayer from "@/components/QuizPlayer";
import type { Profile } from "@/lib/types";

export default async function QuizPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as Profile | null;
  if (!profile) redirect("/register");

  return <QuizPlayer profileName={profile.full_name || "Student"} profileGrade={profile.grade ?? null} />;
}
