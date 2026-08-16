import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPanel from "@/components/AdminPanel";
import type { Profile } from "@/lib/types";

export default async function AdminPage() {
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
  if (!profile || profile.role !== "admin") redirect("/");

  return <AdminPanel profile={profile} />;
}
