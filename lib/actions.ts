"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { adminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { isAdminEmail, isAdminUser, signTeacherToken, teacherCookieName } from "./auth";

type ActionResult = { ok: boolean; error?: string; data?: unknown };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".");
}

function genPassword(len = 9): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/* ── Student ─────────────────────────────────────────── */

export async function registerStudent(input: {
  name: string;
  grade: string;
  phone: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in to register." };
  if (!input.name.trim()) return { ok: false, error: "Please enter your name." };
  if (!input.grade) return { ok: false, error: "Please pick your grade." };

  const email = user.email || "";
  const name = input.name.trim();
  const phone = input.phone.trim() || null;

  const { data: existing } = await adminClient()
    .from("students")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "This account is already registered." };
  }

  const { error } = await adminClient().from("students").insert({
    id: user.id,
    email,
    name,
    grade: input.grade,
    phone,
  });

  if (error) {
    return { ok: false, error: `Could not register: ${error.message}` };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function signOutStudent(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

/* ── Teacher session ─────────────────────────────────── */

export async function teacherLogin(
  username: string,
  password: string
): Promise<ActionResult> {
  const uname = username.trim().toLowerCase();
  if (!uname || !password) return { ok: false, error: "Enter username and password." };

  const { data: teacher, error } = await adminClient()
    .from("teachers")
    .select("id, username, password_hash")
    .eq("username", uname)
    .maybeSingle();

  if (error || !teacher) {
    return { ok: false, error: "No teacher account with that username." };
  }

  const match = await bcrypt.compare(password, teacher.password_hash);
  if (!match) return { ok: false, error: "Incorrect password." };

  const token = await signTeacherToken({ tid: teacher.id, user: teacher.username });
  const cookieStore = await cookies();
  cookieStore.set(teacherCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  revalidatePath("/teacher");
  return { ok: true };
}

export async function teacherLogout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(teacherCookieName());
  revalidatePath("/teacher");
}

/* ── Teacher (guarded by teacher session cookie) ─────── */

async function requireTeacher(): Promise<{ ok: true; teacherId: number } | ActionResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(teacherCookieName())?.value;
  if (!token) return { ok: false, error: "Not signed in." };
  const { verifyTeacherToken } = await import("./auth");
  const claims = await verifyTeacherToken(token);
  if (!claims) return { ok: false, error: "Session expired. Please log in again." };
  return { ok: true, teacherId: claims.tid };
}

export async function teacherAddResult(input: {
  studentId: string;
  paper: string;
  marks: number;
  total: number;
  date: string;
}): Promise<ActionResult> {
  const guard = await requireTeacher();
  if (!guard.ok) return guard;
  if (!input.studentId || !input.paper.trim()) return { ok: false, error: "Choose a student and enter a paper name." };
  if (input.marks < 0 || input.total <= 0) return { ok: false, error: "Invalid marks." };
  if (input.marks > input.total) return { ok: false, error: "Marks cannot exceed the total." };

  const { error } = await adminClient().from("results").insert({
    student_id: input.studentId,
    paper: input.paper.trim(),
    marks: input.marks,
    total: input.total,
    date: input.date.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/teacher");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function teacherDeleteResult(resultId: number): Promise<ActionResult> {
  const guard = await requireTeacher();
  if (!guard.ok) return guard;
  const { error } = await adminClient().from("results").delete().eq("id", resultId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/teacher");
  revalidatePath("/dashboard");
  return { ok: true };
}

/* ── Admin (all guarded by email) ────────────────────── */

async function requireAdmin(): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!(await isAdminUser(user.email))) return { ok: false, error: "Access denied." };
  return { ok: true, email: user.email! };
}

export async function adminSetApproval(
  studentId: string,
  approved: boolean
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { error } = await adminClient()
    .from("students")
    .update({ approved })
    .eq("id", studentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function adminDeleteStudent(studentId: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { error } = await adminClient()
    .from("students")
    .delete()
    .eq("id", studentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminUpdateStudent(
  studentId: string,
  input: { name: string; grade: string; phone: string }
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { error } = await adminClient()
    .from("students")
    .update({
      name: input.name.trim(),
      grade: input.grade,
      phone: input.phone.trim() || null,
    })
    .eq("id", studentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminAddResult(input: {
  studentId: string;
  paper: string;
  marks: number;
  total: number;
  date: string;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  if (!input.studentId || !input.paper.trim()) return { ok: false, error: "Choose a student and enter a paper name." };
  if (input.marks < 0 || input.total <= 0) return { ok: false, error: "Invalid marks." };
  if (input.marks > input.total) return { ok: false, error: "Marks cannot exceed the total." };

  const { error } = await adminClient().from("results").insert({
    student_id: input.studentId,
    paper: input.paper.trim(),
    marks: input.marks,
    total: input.total,
    date: input.date.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function adminDeleteResult(resultId: number): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { error } = await adminClient().from("results").delete().eq("id", resultId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function adminDeleteQuizScore(scoreId: number): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { error } = await adminClient().from("quiz_scores").delete().eq("id", scoreId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function adminCreateTeacher(name: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  if (!name.trim()) return { ok: false, error: "Enter the teacher's name." };

  const username = slugify(name);
  if (!username) return { ok: false, error: "Name must contain letters." };

  let finalUsername = username;
  let attempt = 0;
  while (attempt < 10) {
    const { data: dup } = await adminClient()
      .from("teachers")
      .select("id")
      .eq("username", finalUsername)
      .maybeSingle();
    if (!dup) break;
    finalUsername = `${username}${++attempt}`;
  }

  const password = genPassword();
  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await adminClient()
    .from("teachers")
    .insert({ name: name.trim(), username: finalUsername, password_hash: hash })
    .select("id, name, username, created_at")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, data: { ...data, password } };
}

export async function adminDeleteTeacher(teacherId: number): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { error } = await adminClient().from("teachers").delete().eq("id", teacherId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminResetTeacherPassword(
  teacherId: number
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const password = genPassword();
  const hash = await bcrypt.hash(password, 10);
  const { error } = await adminClient()
    .from("teachers")
    .update({ password_hash: hash })
    .eq("id", teacherId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, data: { password } };
}

export async function adminAddNotice(message: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  if (!message.trim()) return { ok: false, error: "Notice message is empty." };
  const { error } = await adminClient().from("notices").insert({
    message: message.trim(),
    active: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminToggleNotice(
  noticeId: number,
  active: boolean
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { error } = await adminClient()
    .from("notices")
    .update({ active })
    .eq("id", noticeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminDeleteNotice(noticeId: number): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { error } = await adminClient().from("notices").delete().eq("id", noticeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function adminListAdmins(): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { data, error } = await adminClient()
    .from("admins")
    .select("id, email, created_at")
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function adminAddAdmin(email: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (isAdminEmail(clean)) return { ok: false, error: "That email is already the owner admin." };
  const { data: existing } = await adminClient()
    .from("admins")
    .select("id")
    .eq("email", clean)
    .maybeSingle();
  if (existing) return { ok: false, error: "That email is already an admin." };
  const { error } = await adminClient().from("admins").insert({ email: clean });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminRemoveAdmin(email: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const clean = email.trim().toLowerCase();
  if (isAdminEmail(clean)) return { ok: false, error: "The owner admin cannot be removed." };
  if (guard.email.toLowerCase() === clean) {
    return { ok: false, error: "You cannot remove yourself." };
  }
  const { error } = await adminClient().from("admins").delete().eq("email", clean);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
