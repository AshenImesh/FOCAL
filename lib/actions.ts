"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseQuizMarkdown } from "@/lib/quiz-markdown";
import type { Profile } from "@/lib/types";

/* ── helpers ─────────────────────────────────────────── */

async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/register");
  return profile as Profile;
}

async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "teacher" && profile.role !== "admin") redirect("/");
  return profile;
}

async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/");
  return profile;
}

const SESSION_SECRET = process.env.SESSION_SECRET || "focal-dev-secret-change-me";
const TEACHER_COOKIE = "focal_teacher";

/** True if this email belongs to the owner (env) or an added admin. */
export async function isAdminEmail(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;
  const norm = email.trim().toLowerCase();
  if (process.env.ADMIN_EMAIL && norm === process.env.ADMIN_EMAIL.toLowerCase()) return true;
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await (admin.from("admins") as any)
    .select("id")
    .eq("email", norm)
    .maybeSingle();
  return !!data;
}

function signToken(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload.tid as string;
  } catch {
    return null;
  }
}

export async function getTeacherFromCookie() {
  const cookieStore = await cookies();
  const tid = verifyToken(cookieStore.get(TEACHER_COOKIE)?.value);
  if (!tid) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("teachers")
    .select("id, full_name, username, created_at")
    .eq("id", tid)
    .maybeSingle();
  return data;
}

/* ── auth ────────────────────────────────────────────── */

export async function logoutUser() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

export async function teacherLogin(formData: FormData) {
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const admin = createAdminClient();
  if (!admin) return { error: "Server not configured yet." };
  const { data: teacher } = await (admin.from("teachers") as any)
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (!teacher) return { error: "Invalid username or password." };
  const ok = await bcrypt.compare(password, teacher.password_hash);
  if (!ok) return { error: "Invalid username or password." };
  const token = signToken({ tid: teacher.id, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const cookieStore = await cookies();
  cookieStore.set(TEACHER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  revalidatePath("/teacher");
  return { ok: true };
}

export async function teacherLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(TEACHER_COOKIE);
  revalidatePath("/teacher");
}

/* ── registration ────────────────────────────────────── */

export async function completeRegistration(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const full_name = String(formData.get("full_name") || "").trim();
  const grade = Number(formData.get("grade"));
  const phone = String(formData.get("phone") || "").trim();
  if (!full_name || !grade) return { error: "Name and grade are required." };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const isAdmin = await isAdminEmail(user.email);
    await supabase.from("profiles").insert({
      id: user.id,
      full_name,
      grade,
      phone: phone || null,
      role: isAdmin ? "admin" : "student",
      status: isAdmin ? "approved" : "pending",
    });
  } else {
    await supabase
      .from("profiles")
      .update({ full_name, grade, phone: phone || null })
      .eq("id", user.id);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/* ── quiz ────────────────────────────────────────────── */

export async function submitQuiz(data: {
  grade: number;
  answers: { qid: string; selected: number }[];
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  if (!supabase) return { error: "Not configured" };
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, answer")
    .eq("grade", data.grade);
  if (!questions?.length) return { error: "No questions for this grade." };

  let score = 0;
  const breakdown = questions.map((q) => {
    const a = data.answers.find((x) => x.qid === q.id);
    const ok = !!a && a.selected === q.answer;
    if (ok) score++;
    return { qid: q.id, ok };
  });
  const total = questions.length;
  const pct = Math.round((score / total) * 100);

  const { error } = await supabase.from("quiz_scores").insert({
    student_id: profile.id,
    grade: data.grade,
    score,
    total,
    pct,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/board");
  return { score, total, pct, breakdown };
}

/* ── paper results (teacher + admin) ─────────────────── */

export async function addPaperResult(formData: FormData) {
  await requireStaff();
  const supabase = await createClient();
  if (!supabase) return { error: "Not configured" };
  const student_id = String(formData.get("student_id") || "");
  const paper_name = String(formData.get("paper_name") || "").trim();
  const marks = Number(formData.get("marks"));
  const total = Number(formData.get("total"));
  const date = String(formData.get("date") || "").trim();
  if (!student_id || !paper_name || !marks) return { error: "Fill all fields." };
  if (marks > total) return { error: "Marks cannot exceed the total." };

  const { error } = await supabase.from("papers").insert({
    student_id,
    paper_name,
    marks,
    total,
    date: date || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/board");
  revalidatePath("/teacher");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deletePaper(id: string) {
  await requireStaff();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("papers").delete().eq("id", id);
  revalidatePath("/dashboard");
  revalidatePath("/board");
  revalidatePath("/teacher");
  revalidatePath("/admin");
}

/* ── admin: students ─────────────────────────────────── */

export async function setStudentStatus(id: string, status: string) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { error: "Not configured" };
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateStudent(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { error: "Not configured" };
  const id = String(formData.get("id") || "");
  const full_name = String(formData.get("full_name") || "").trim();
  const grade = Number(formData.get("grade"));
  const phone = String(formData.get("phone") || "").trim();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: full_name || null,
      grade: grade || null,
      phone: phone || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteStudent(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const supabase = await createClient();
  if (!admin || !supabase) return { error: "Not configured" };
  await admin.auth.admin.deleteUser(id);
  await supabase.from("profiles").delete().eq("id", id);
  revalidatePath("/admin");
  return { ok: true };
}

/* ── admin: teachers ─────────────────────────────────── */

export async function createTeacher(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Not configured" };
  const full_name = String(formData.get("full_name") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!full_name || !username || password.length < 4)
    return { error: "Name, username and a password of 4+ characters are required." };
  const { data: exists } = await admin
    .from("teachers")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (exists) return { error: "That username is taken." };
  const hash = await bcrypt.hash(password, 10);
  const { error } = await (admin.from("teachers") as any).insert({
    full_name,
    username,
    password_hash: hash,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateTeacher(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Not configured" };
  const id = String(formData.get("id") || "");
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!username || password.length < 4)
    return { error: "Username and a password of 4+ characters are required." };
  const hash = await bcrypt.hash(password, 10);
  const { error } = await (admin.from("teachers") as any)
    .update({ username, password_hash: hash })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteTeacher(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Not configured" };
  const { error } = await admin.from("teachers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

/* ── admin: notices ──────────────────────────────────── */

export async function addNotice(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { error: "Not configured" };
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!title || !body) return { error: "Title and message are required." };
  const { error } = await supabase.from("notices").insert({ title, body });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleNotice(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("notices").update({ active: !active }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteNotice(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("notices").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin");
}

/* ── admin: quiz bank (markdown upload) ─────────────── */

export async function uploadQuizBank(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Not configured" };
  const grade = Number(formData.get("grade"));
  const markdown = String(formData.get("markdown") || "");
  const replace = formData.get("replace") === "on";
  if (!grade) return { error: "Pick a grade." };
  const questions = parseQuizMarkdown(markdown);
  if (!questions.length) return { error: "No valid questions found. Check the format." };

  if (replace) {
    const { error: delErr } = await admin.from("quiz_questions").delete().eq("grade", grade);
    if (delErr) return { error: delErr.message };
  }

  const rows = questions.map((q) => ({
    grade,
    question: q.question,
    options: q.options,
    answer: q.answer,
    feedback: q.feedback,
  }));
  const { error } = await (admin.from("quiz_questions") as any).insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/quiz");
  revalidatePath("/admin");
  return { ok: true, count: rows.length, replaced: replace };
}

export async function clearQuizGrade(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Not configured" };
  const grade = Number(formData.get("grade"));
  if (!grade) return { error: "Pick a grade." };
  const { error } = await admin.from("quiz_questions").delete().eq("grade", grade);
  if (error) return { error: error.message };
  revalidatePath("/quiz");
  revalidatePath("/admin");
  return { ok: true };
}

/* ── admin: admin emails ─────────────────────────────── */

export async function listAdmins() {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Not configured" };
  const { data } = await (admin.from("admins") as any)
    .select("id, email, created_at")
    .order("created_at");
  return { admins: (data || []) as { id: string; email: string; created_at: string }[] };
}

export async function addAdminEmail(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Not configured" };
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Enter a valid email address." };
  const { data: exists } = await (admin.from("admins") as any)
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (exists) return { error: "That email is already an admin." };
  const { error } = await (admin.from("admins") as any).insert({ email });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true, email };
}

export async function removeAdminEmail(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Not configured" };
  const id = String(formData.get("id") || "");
  const { data: row } = await (admin.from("admins") as any)
    .select("email")
    .eq("id", id)
    .maybeSingle();
  if (row && process.env.ADMIN_EMAIL && row.email === process.env.ADMIN_EMAIL.toLowerCase()) {
    return { error: "You can't remove the owner's email." };
  }
  const { error } = await (admin.from("admins") as any).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
