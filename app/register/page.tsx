import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RegisterForm from "@/components/RegisterForm";
import type { Profile } from "@/lib/types";

export default async function RegisterPage() {
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

  // staff already have their panels
  if (profile?.role === "admin") redirect("/admin");
  if (profile?.role === "teacher") redirect("/teacher");

  // already registered with a grade → straight to dashboard
  if (profile?.grade) redirect("/dashboard");

  return (
    <div className="auth-wrap">
      <div className="card auth-card" style={{ textAlign: "left" }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          Almost there
        </div>
        <h1 style={{ textAlign: "left" }}>Complete your registration</h1>
        <p className="sub" style={{ textAlign: "left" }}>
          Signed in as <b style={{ color: "var(--ink)" }}>{user.email}</b>. Tell us a little about
          yourself — the teacher will approve your registration shortly.
        </p>
        <RegisterForm
          defaultName={String(user.user_metadata?.full_name || user.email?.split("@")[0] || "")}
        />
      </div>
    </div>
  );
}
