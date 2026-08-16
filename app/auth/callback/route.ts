import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // make sure a profile exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, grade")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin =
    !!process.env.ADMIN_EMAIL &&
    user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

  if (!profile) {
    const { error: insErr } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
      role: isAdmin ? "admin" : "student",
      status: isAdmin ? "approved" : "pending",
    });
    if (insErr) {
      console.error("callback: failed to create profile", insErr.message);
      return NextResponse.redirect(new URL("/register", request.url));
    }
    if (isAdmin) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.redirect(new URL("/register", request.url));
  }

  if (isAdmin) {
    const admin = createAdminClient();
    if (admin) {
      await (admin.from("profiles") as any)
        .update({ role: "admin", status: "approved" })
        .eq("id", user.id);
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (profile.role === "teacher") return NextResponse.redirect(new URL("/teacher", request.url));
  if (!profile.grade) return NextResponse.redirect(new URL("/register", request.url));
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
