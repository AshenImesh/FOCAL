import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/register");

  const email = user.email || "";

  const { data: existing } = await adminClient()
    .from("students")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) redirect("/dashboard");

  const name = (user.user_metadata?.full_name as string) || "";

  return (
    <div className="view">
      <div className="page-head center">
        <span className="eyebrow">Almost there</span>
        <h1>Student registration</h1>
        <p>Sign up once so your results and quiz scores follow your account.</p>
      </div>
      <RegisterForm name={name} email={email} />
    </div>
  );
}
