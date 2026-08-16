import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
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

  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <div className="page-head">
        <span className="eyebrow">My account</span>
        <h1>Profile</h1>
        <p>Your name appears on results and the leaderboard — keep it up to date.</p>
      </div>
      <div className="card" style={{ padding: 28 }}>
        <ProfileForm profile={profile} email={user.email || ""} />
      </div>
    </div>
  );
}