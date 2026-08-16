"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  setStudentStatus,
  updateStudent,
  deleteStudent,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  addNotice,
  toggleNotice,
  deleteNotice,
  uploadQuizBank,
  clearQuizGrade,
  uploadPaperResults,
  updatePaper,
  deletePaper,
  listAdmins,
  addAdminEmail,
  removeAdminEmail,
  listUserRequests,
  resolveUserRequest,
  listContactRequests,
  deleteContactRequest,
} from "@/lib/actions";
import { Icon } from "@/components/icons";
import LogoutButton from "@/components/LogoutButton";
import { buildQuizTemplate } from "@/lib/quiz-markdown";
import { buildResultsTemplate } from "@/lib/results-markdown";
import type { ContactRequest, Notice, Paper, Profile, QuizScore, Teacher, UserRequest } from "@/lib/types";

type Tab = "overview" | "requests" | "appeals" | "contacts" | "students" | "teachers" | "quizbank" | "results" | "admins" | "notices";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "requests", label: "Registration requests" },
  { id: "appeals", label: "User changes" },
  { id: "contacts", label: "Contact requests" },
  { id: "students", label: "Students" },
  { id: "teachers", label: "Teachers" },
  { id: "admins", label: "Admins" },
  { id: "quizbank", label: "Quiz bank" },
  { id: "results", label: "Results" },
  { id: "notices", label: "Notices" },
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function genPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 10; i++) out += chars[arr[i] % chars.length];
  return out;
}

export default function AdminPanel({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [students, setStudents] = useState<Profile[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", grade: "", phone: "" });
  const [tForm, setTForm] = useState({ full_name: "", username: "", password: genPassword() });
  const [tEdit, setTEdit] = useState<string | null>(null);
  const [tEditForm, setTEditForm] = useState({ username: "", password: "" });
  const [nForm, setNForm] = useState({ title: "", body: "" });
  const [qGrade, setQGrade] = useState("6");
  const [qMarkdown, setQMarkdown] = useState(buildQuizTemplate());
  const [qReplace, setQReplace] = useState(false);
  const [qCounts, setQCounts] = useState<Record<string, number>>({});
  const [admins, setAdmins] = useState<{ id: string; email: string; created_at: string }[]>([]);
  const [aForm, setAForm] = useState("");
  const [appeals, setAppeals] = useState<UserRequest[]>([]);
  const [appealNames, setAppealNames] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [rMarkdown, setRMarkdown] = useState(buildResultsTemplate());
  const [rGrade, setRGrade] = useState("all");
  const [pEdit, setPEdit] = useState<string | null>(null);
  const [pEditForm, setPEditForm] = useState({ paper_name: "", marks: "", total: "", date: "" });

  const flash = (m: string, isErr = false) => {
    setMsg(isErr ? "" : m);
    setErr(isErr ? m : "");
    setTimeout(() => {
      setMsg("");
      setErr("");
    }, 3000);
  };

  const load = useCallback(async () => {
    if (!supabase) return;
    const [p, t, n, pp, q, qq] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("teachers").select("id, full_name, username, created_at").order("created_at"),
      supabase.from("notices").select("*").order("created_at", { ascending: false }),
      supabase.from("papers").select("*"),
      supabase.from("quiz_scores").select("*"),
      supabase.from("quiz_questions").select("grade"),
    ]);
    setStudents((p.data || []) as Profile[]);
    setTeachers((t.data || []) as Teacher[]);
    setNotices((n.data || []) as Notice[]);
    setPapers((pp.data || []) as Paper[]);
    setScores((q.data || []) as QuizScore[]);
    const counts: Record<string, number> = {};
    ((qq.data || []) as { grade: number }[]).forEach((r) => {
      counts[r.grade] = (counts[r.grade] || 0) + 1;
    });
    setQCounts(counts);
    const [ar, cr] = await Promise.all([listUserRequests(), listContactRequests()]);
    if (ar && "requests" in ar && ar.requests) {
      setAppeals(ar.requests);
      const names: Record<string, string> = {};
      ((p.data || []) as Profile[]).forEach((s) => {
        names[s.id] = s.full_name || "Student";
      });
      setAppealNames(names);
    }
    if (cr && "requests" in cr && cr.requests) setContacts(cr.requests);
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = students.filter((s) => s.status === "pending" && s.role === "student");
  const approved = students.filter((s) => s.status === "approved" && s.role === "student");
  const rejected = students.filter((s) => s.status === "rejected" && s.role === "student");

  async function doSetStatus(id: string, status: string) {
    const res = await setStudentStatus(id, status);
    if (res && "error" in res && res.error) flash(res.error, true);
    else flash(status === "approved" ? "Student approved — results unlocked." : "Student marked " + status + ".");
    load();
    router.refresh();
  }

  async function doUpdateStudent(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("full_name", editForm.full_name);
    fd.set("grade", editForm.grade);
    fd.set("phone", editForm.phone);
    const res = await updateStudent(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else flash("Student updated.");
    setEditing(null);
    load();
    router.refresh();
  }

  async function doDeleteStudent(id: string) {
    if (!confirm("Delete this student AND their account? This cannot be undone.")) return;
    const res = await deleteStudent(id);
    if (res && "error" in res && res.error) flash(res.error, true);
    else flash("Student deleted.");
    load();
  }

  async function doCreateTeacher(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("full_name", tForm.full_name);
    fd.set("username", tForm.username);
    fd.set("password", tForm.password);
    const res = await createTeacher(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else flash(`Teacher created — username: ${tForm.username}, password: ${tForm.password}. Share these with them.`);
    load();
  }

  async function doUpdateTeacher(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("username", tEditForm.username);
    fd.set("password", tEditForm.password);
    const res = await updateTeacher(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else flash("Teacher credentials updated.");
    setTEdit(null);
    load();
  }

  async function doDeleteTeacher(id: string) {
    if (!confirm("Remove this teacher's login?")) return;
    await deleteTeacher(id);
    flash("Teacher removed.");
    load();
  }

  async function doAddNotice(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("title", nForm.title);
    fd.set("body", nForm.body);
    const res = await addNotice(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else {
      flash("Notice published — it now shows on the site banner.");
      setNForm({ title: "", body: "" });
    }
    load();
    router.refresh();
  }

  async function doToggleNotice(id: string, active: boolean) {
    await toggleNotice(id, active);
    load();
    router.refresh();
  }

  async function doDeleteNotice(id: string) {
    await deleteNotice(id);
    load();
    router.refresh();
  }

  async function doUploadQuiz(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("grade", qGrade);
    fd.set("markdown", qMarkdown);
    fd.set("replace", qReplace ? "on" : "off");
    const res = await uploadQuizBank(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else if (res && "count" in res) {
      flash(
        `Uploaded ${res.count} question${res.count !== 1 ? "s" : ""} to Grade ${qGrade}${res.replaced ? " (replaced existing)" : ""}.`
      );
      setQMarkdown(buildQuizTemplate());
    }
    load();
    router.refresh();
  }

  async function doClearQuizGrade() {
    if (!confirm(`Delete ALL quiz questions for Grade ${qGrade}? This cannot be undone.`)) return;
    const fd = new FormData();
    fd.set("grade", qGrade);
    const res = await clearQuizGrade(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else flash(`Cleared all questions for Grade ${qGrade}.`);
    load();
    router.refresh();
  }

  async function doLoadAdmins() {
    const res = await listAdmins();
    if (res && "admins" in res && res.admins) setAdmins(res.admins);
  }

  async function doLoadAppeals() {
    const res = await listUserRequests();
    if (res && "requests" in res && res.requests) {
      setAppeals(res.requests);
      const names: Record<string, string> = {};
      students.forEach((s) => {
        names[s.id] = s.full_name || "Student";
      });
      setAppealNames(names);
    }
  }

  async function doResolveAppeal(id: number, action: "approve" | "reject") {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("action", action);
    const res = await resolveUserRequest(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else flash(action === "approve" ? "Change applied — the student keeps all their progress." : "Request rejected.");
    doLoadAppeals();
    router.refresh();
  }

  async function doLoadContacts() {
    const res = await listContactRequests();
    if (res && "requests" in res && res.requests) setContacts(res.requests);
  }

  async function doDeleteContact(id: number) {
    if (!confirm("Delete this contact request?")) return;
    const res = await deleteContactRequest(id);
    if (res && "error" in res && res.error) flash(res.error, true);
    else flash("Contact request deleted.");
    doLoadContacts();
  }

  async function doUploadResults(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("text", rMarkdown);
    const res = await uploadPaperResults(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else if ("inserted" in res) {
      const skipped = (res.skipped || []).length;
      flash(
        `Uploaded ${res.inserted} new + updated ${res.updated} result${skipped ? `, skipped ${skipped} line(s)` : ""}.`
      );
      if (skipped && res.skipped && res.skipped.length) {
        setErr(
          res.skipped
            .map((s) => (s.line ? `Line ${s.line}: ${s.reason}` : s.reason))
            .join(" · ")
        );
      }
      setRMarkdown(buildResultsTemplate());
    }
    load();
    router.refresh();
  }

  async function doUpdatePaper(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("paper_name", pEditForm.paper_name);
    fd.set("marks", pEditForm.marks);
    fd.set("total", pEditForm.total);
    fd.set("date", pEditForm.date);
    const res = await updatePaper(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else flash("Result updated.");
    setPEdit(null);
    load();
    router.refresh();
  }

  async function doDeletePaper(id: string) {
    if (!confirm("Delete this result? This cannot be undone.")) return;
    await deletePaper(id);
    flash("Result deleted.");
    load();
    router.refresh();
  }

  async function doAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("email", aForm);
    const res = await addAdminEmail(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else {
      flash(`Added ${aForm} as an admin. They can sign in with Google and manage the site.`);
      setAForm("");
      doLoadAdmins();
    }
  }

  async function doRemoveAdmin(id: string) {
    if (!confirm("Remove this admin? They will lose access to the admin panel.")) return;
    const fd = new FormData();
    fd.set("id", id);
    const res = await removeAdminEmail(fd);
    if (res && "error" in res && res.error) flash(res.error, true);
    else {
      flash("Admin removed.");
      doLoadAdmins();
    }
  }

  const counts = {
    students: students.filter((s) => s.role === "student").length,
    approved: approved.length,
    pending: pending.length,
    papers: papers.length,
    quizzes: scores.length,
    teachers: teachers.length,
  };

  const statusPill = (s: string) =>
    s === "approved" ? (
      <span className="pill pill-ok">
        <span className="dot" /> Approved
      </span>
    ) : s === "pending" ? (
      <span className="pill pill-wait">
        <span className="dot" /> Pending
      </span>
    ) : (
      <span className="pill pill-bad">
        <span className="dot" /> Rejected
      </span>
    );

  const filteredStudents = students.filter(
    (s) => s.role === "student" && (gradeFilter === "all" || String(s.grade) === gradeFilter)
  );

  const sortedPapers = [...papers]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .filter((p) => {
      if (rGrade === "all") return true;
      const stu = students.find((s) => s.id === p.student_id);
      return String(stu?.grade) === rGrade;
    });

  return (
    <div className="admin-wrap">
      <div className="page-head">
        <span className="eyebrow">Admin control panel</span>
        <h1>FOCAL Control Panel</h1>
        <p>
          Welcome, {profile.full_name}. Approve registrations, manage students, teachers and notices.
        </p>
      </div>

      <div className="panel-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"tab" + (tab === t.id ? " active" : "")}
            onClick={() => {
              setTab(t.id);
              if (t.id === "admins") doLoadAdmins();
              if (t.id === "appeals") doLoadAppeals();
              if (t.id === "contacts") doLoadContacts();
            }}
          >
            {t.label}
            {t.id === "requests" && pending.length > 0 && <span className="tab-badge">{pending.length}</span>}
            {t.id === "appeals" && appeals.filter((r) => r.status === "pending").length > 0 && (
              <span className="tab-badge">{appeals.filter((r) => r.status === "pending").length}</span>
            )}
            {t.id === "contacts" && contacts.length > 0 && <span className="tab-badge">{contacts.length}</span>}
          </button>
        ))}
      </div>

      {msg && (
        <div className="status-banner pending" style={{ background: "var(--good-soft)", borderColor: "var(--good-line)", color: "var(--good)" }}>
          {msg}
        </div>
      )}
      {err && <div className="form-error">{err}</div>}

      {!loaded ? (
        <div className="empty">
          <p style={{ color: "var(--faint)" }}>Loading…</p>
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <div className="kpi-row" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
              <div className="kpi">
                <div className="n">{counts.students}</div>
                <div className="l">Total students</div>
              </div>
              <div className="kpi">
                <div className="n good">{counts.approved}</div>
                <div className="l">Approved</div>
              </div>
              <div className="kpi">
                <div className="n warn">{counts.pending}</div>
                <div className="l">Pending approval</div>
              </div>
              <div className="kpi">
                <div className="n accent">{counts.papers}</div>
                <div className="l">Paper results</div>
              </div>
              <div className="kpi">
                <div className="n accent">{counts.quizzes}</div>
                <div className="l">Quiz attempts</div>
              </div>
              <div className="kpi">
                <div className="n">{counts.teachers}</div>
                <div className="l">Teachers</div>
              </div>
            </div>
          )}

          {tab === "requests" && (
            <div className="card admin-sec" style={{ padding: "14px 20px" }}>
              <div className="sec-title" style={{ marginBottom: 6 }}>
                <span className="dot" /> Awaiting approval ({pending.length})
              </div>
              {pending.length === 0 ? (
                <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "10px 0" }}>
                  No pending registrations. New Google registrations appear here.
                </p>
              ) : (
                pending.map((s) => (
                  <div className="list-row" key={s.id}>
                    <div className="who">
                      <div className="mini">{initials(s.full_name || "?")}</div>
                      <div>
                        <div className="nm">{s.full_name}</div>
                        <div className="sub">
                          Grade {s.grade} · {s.phone || "no phone"} · joined{" "}
                          {new Date(s.created_at).toLocaleDateString("en-GB")}
                        </div>
                      </div>
                    </div>
                    <div className="acts">
                      <button className="btn btn-primary btn-sm" onClick={() => doSetStatus(s.id, "approved")}>
                        <Icon name="check" size={14} /> Approve
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => doSetStatus(s.id, "rejected")}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "appeals" && (
            <div className="card admin-sec" style={{ padding: "14px 20px" }}>
              <div className="sec-title" style={{ marginBottom: 6 }}>
                <span className="dot" /> Change requests ({appeals.filter((r) => r.status === "pending").length} pending)
              </div>
              {appeals.length === 0 ? (
                <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "10px 0" }}>
                  No change requests yet. Students appeal here when they want a new Gmail or grade.
                </p>
              ) : (
                appeals.map((r) => (
                  <div className="list-row" key={r.id}>
                    <div className="who">
                      <div className="mini">{initials(appealNames[r.user_id] || "?")}</div>
                      <div>
                        <div className="nm">
                          {appealNames[r.user_id] || "Student"}
                          {r.status === "pending" ? (
                            <span className="pill pill-wait" style={{ marginLeft: 8 }}>
                              <span className="dot" /> Pending
                            </span>
                          ) : r.status === "approved" ? (
                            <span className="pill pill-ok" style={{ marginLeft: 8 }}>
                              <span className="dot" /> Approved
                            </span>
                          ) : (
                            <span className="pill pill-bad" style={{ marginLeft: 8 }}>
                              <span className="dot" /> Rejected
                            </span>
                          )}
                        </div>
                        <div className="sub">
                          {r.kind === "email" ? (
                            <>
                              Change Gmail: <b>{r.current_value}</b> → <b>{r.requested_value}</b>
                            </>
                          ) : (
                            <>
                              Change grade: <b>{r.current_value}</b> → <b>{r.requested_value}</b>
                            </>
                          )}{" "}
                          · requested {new Date(r.created_at).toLocaleDateString("en-GB")}
                        </div>
                      </div>
                    </div>
                    {r.status === "pending" ? (
                      <div className="acts">
                        <button className="btn btn-primary btn-sm" onClick={() => doResolveAppeal(r.id, "approve")}>
                          <Icon name="check" size={14} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => doResolveAppeal(r.id, "reject")}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="acts" style={{ fontSize: ".78rem", color: "var(--faint)" }}>
                        {r.status === "approved" ? "Applied" : "Declined"}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "contacts" && (
            <div className="card admin-sec" style={{ padding: "14px 20px" }}>
              <div className="sec-title" style={{ marginBottom: 6 }}>
                <span className="dot" /> Teacher contact requests ({contacts.length})
              </div>
              {contacts.length === 0 ? (
                <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "10px 0" }}>
                  No contact requests yet. Messages sent from the homepage&apos;s "Contact teacher"
                  form appear here.
                </p>
              ) : (
                contacts.map((c) => (
                  <div className="list-row" key={c.id}>
                    <div className="who">
                      <div className="mini">{initials(c.name || "?")}</div>
                      <div>
                        <div className="nm">
                          {c.name || "Anonymous"}
                          <a className="sub" href={"tel:" + c.phone} style={{ display: "block", color: "var(--accent)", fontWeight: 600 }}>
                            {c.phone}
                          </a>
                        </div>
                        <div className="sub" style={{ whiteSpace: "pre-wrap", maxWidth: 420 }}>
                          {c.message}
                        </div>
                      </div>
                    </div>
                    <div className="acts">
                      <span className="sub" style={{ marginRight: 10 }}>
                        {new Date(c.created_at).toLocaleDateString("en-GB")}
                      </span>
                      <button className="icon-btn" title="Delete" onClick={() => doDeleteContact(c.id)}>
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "students" && (
            <div className="card admin-sec" style={{ padding: "14px 20px" }}>
              <div className="filter-row" style={{ marginBottom: 10 }}>
                <span className="f-label">Grade</span>
                <button className={"chip" + (gradeFilter === "all" ? " active" : "")} onClick={() => setGradeFilter("all")}>
                  All
                </button>
                {["6", "7", "8", "9", "10", "11"].map((g) => (
                  <button key={g} className={"chip" + (gradeFilter === g ? " active" : "")} onClick={() => setGradeFilter(g)}>
                    Grade {g}
                  </button>
                ))}
              </div>
              {filteredStudents.length === 0 ? (
                <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "10px 0" }}>No students in this filter.</p>
              ) : (
                filteredStudents.map((s) => {
                  const sPapers = papers.filter((p) => p.student_id === s.id);
                  const sScores = scores.filter((q) => q.student_id === s.id);
                  const avg = sPapers.length
                    ? Math.round((sPapers.reduce((a, p) => a + p.marks, 0) / sPapers.reduce((a, p) => a + p.total, 0)) * 100)
                    : null;
                  return (
                    <div className="list-row" key={s.id} style={{ alignItems: "flex-start" }}>
                      <div className="who">
                        <div className="mini">{initials(s.full_name || "?")}</div>
                        <div style={{ flex: 1 }}>
                          {editing === s.id ? (
                            <div className="grid-2" style={{ gap: 8 }}>
                              <input
                                className="input"
                                value={editForm.full_name}
                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                style={{ padding: 8, fontSize: ".85rem" }}
                              />
                              <select
                                className="input"
                                value={editForm.grade}
                                onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                                style={{ padding: 8, fontSize: ".85rem" }}
                              >
                                {["6", "7", "8", "9", "10", "11"].map((g) => (
                                  <option key={g} value={g}>
                                    Grade {g}
                                  </option>
                                ))}
                              </select>
                              <input
                                className="input"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                placeholder="Phone"
                                style={{ padding: 8, fontSize: ".85rem" }}
                              />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button className="btn btn-primary btn-sm" onClick={() => doUpdateStudent(s.id)}>
                                  Save
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="nm" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                {s.full_name} · Grade {s.grade} {statusPill(s.status)}
                              </div>
                              <div className="sub">
                                {s.phone || "no phone"} · joined {new Date(s.created_at).toLocaleDateString("en-GB")}
                                {sPapers.length > 0 && (
                                  <>
                                    {" "}
                                    · <b style={{ color: "var(--accent)" }}>avg {avg}%</b> ({sPapers.length} papers)
                                  </>
                                )}
                                {sScores.length > 0 && <> · {sScores.length} quizzes</>}
                              </div>
                              <div className="paper-tags">
                                {sPapers.slice(-3).map((p) => (
                                  <span className="paper-tag" key={p.id}>
                                    {p.paper_name} <b>{p.marks}/{p.total}</b>
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="acts">
                        <button
                          className="icon-btn ok"
                          title="Edit"
                          onClick={() => {
                            setEditing(s.id);
                            setEditForm({ full_name: s.full_name || "", grade: String(s.grade || 6), phone: s.phone || "" });
                          }}
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button className="icon-btn" title="Delete" onClick={() => doDeleteStudent(s.id)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "teachers" && (
            <>
              <div className="card admin-sec" style={{ padding: 26 }}>
                <div className="sec-title">
                  <span className="dot" /> Register a new teacher
                </div>
                <form onSubmit={doCreateTeacher}>
                  <div className="form-grid">
                    <div className="field">
                      <label>Full name</label>
                      <input
                        className="input"
                        value={tForm.full_name}
                        onChange={(e) => setTForm({ ...tForm, full_name: e.target.value })}
                        placeholder="e.g. Mrs. Fernando"
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Username</label>
                      <input
                        className="input"
                        value={tForm.username}
                        onChange={(e) => setTForm({ ...tForm, username: e.target.value.toLowerCase() })}
                        placeholder="e.g. mrs.fernando"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="field">
                      <label>Password</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          className="input"
                          value={tForm.password}
                          onChange={(e) => setTForm({ ...tForm, password: e.target.value })}
                          required
                        />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTForm({ ...tForm, password: genPassword() })}>
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-primary">
                    <Icon name="plus" size={16} /> Create teacher
                  </button>
                </form>
              </div>

              <div className="card admin-sec" style={{ padding: "14px 20px" }}>
                <div className="sec-title" style={{ marginBottom: 6 }}>
                  <span className="dot" /> Existing teachers ({teachers.length})
                </div>
                {teachers.length === 0 ? (
                  <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "10px 0" }}>No teachers yet.</p>
                ) : (
                  teachers.map((t) => (
                    <div className="list-row" key={t.id}>
                      <div className="who">
                        <div className="mini">{initials(t.full_name)}</div>
                        <div>
                          {tEdit === t.id ? (
                            <div className="grid-2" style={{ gap: 8, minWidth: 260 }}>
                              <input
                                className="input"
                                value={tEditForm.username}
                                onChange={(e) => setTEditForm({ ...tEditForm, username: e.target.value })}
                                style={{ padding: 8, fontSize: ".85rem" }}
                              />
                              <input
                                className="input"
                                value={tEditForm.password}
                                onChange={(e) => setTEditForm({ ...tEditForm, password: e.target.value })}
                                placeholder="New password"
                                style={{ padding: 8, fontSize: ".85rem" }}
                              />
                              <button className="btn btn-primary btn-sm" onClick={() => doUpdateTeacher(t.id)}>
                                Save
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setTEdit(null)}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="nm">{t.full_name}</div>
                              <div className="sub">
                                username: <b>{t.username}</b> · created{" "}
                                {new Date(t.created_at).toLocaleDateString("en-GB")}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="acts">
                        <button
                          className="icon-btn ok"
                          title="Change username/password"
                          onClick={() => {
                            setTEdit(t.id);
                            setTEditForm({ username: t.username, password: genPassword() });
                          }}
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button className="icon-btn" title="Delete" onClick={() => doDeleteTeacher(t.id)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === "quizbank" && (
            <>
              <div className="card admin-sec" style={{ padding: 26 }}>
                <div className="sec-title">
                  <span className="dot" /> Upload quiz questions (per grade)
                </div>
                <p style={{ fontSize: ".84rem", color: "var(--muted)", marginBottom: 16 }}>
                  Paste questions in the format below. Each block needs numbered question, A–D
                  options, and an <b>Answer:</b> line. Feedback is optional.
                </p>
                <form onSubmit={doUploadQuiz}>
                  <div className="field">
                    <label>Grade</label>
                    <div className="chips">
                      {["6", "7", "8", "9", "10", "11"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          className={"chip" + (qGrade === g ? " active" : "")}
                          onClick={() => setQGrade(g)}
                        >
                          Grade {g}
                          {qCounts[g] ? <small style={{ marginLeft: 6, opacity: 0.7 }}>· {qCounts[g]}</small> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label>Markdown</label>
                    <textarea
                      className="input"
                      value={qMarkdown}
                      onChange={(e) => setQMarkdown(e.target.value)}
                      style={{ minHeight: 260, fontFamily: "var(--font-b)" }}
                      required
                    />
                  </div>
                  <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <label style={{ marginBottom: 0, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={qReplace}
                        onChange={(e) => setQReplace(e.target.checked)}
                        style={{ marginRight: 7 }}
                      />
                      Replace existing questions for this grade
                    </label>
                  </div>
                  <button className="btn btn-primary">
                    <Icon name="plus" size={16} /> Upload to Grade {qGrade}
                  </button>
                  <button type="button" className="btn btn-ghost" style={{ marginLeft: 10 }} onClick={doClearQuizGrade}>
                    <Icon name="trash" size={15} /> Clear Grade {qGrade}
                  </button>
                </form>
              </div>

              <div className="card admin-sec" style={{ padding: "14px 20px" }}>
                <div className="sec-title" style={{ marginBottom: 6 }}>
                  <span className="dot" /> Question bank summary
                </div>
                {Object.keys(qCounts).length === 0 ? (
                  <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "10px 0" }}>
                    No questions uploaded yet. Use the form above to add questions per grade.
                  </p>
                ) : (
                  <div className="filter-row" style={{ marginBottom: 0 }}>
                    {["6", "7", "8", "9", "10", "11"].map((g) => (
                      <span className="paper-tag" key={g}>
                        Grade {g} · <b>{qCounts[g] || 0}</b>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "results" && (
            <>
              <div className="card admin-sec" style={{ padding: 26 }}>
                <div className="sec-title">
                  <span className="dot" /> Bulk upload paper results
                </div>
                <p style={{ fontSize: ".84rem", color: "var(--muted)", marginBottom: 16 }}>
                  Paste one result per line: <b>Grade, Student name, Paper name, Marks, Total</b>.
                  Total is optional (defaults to 100). Lines starting with <b>#</b> are ignored.
                  Re-uploading a paper for the same student simply updates it — history is never
                  wiped, so it is safe to upload term by term.
                </p>
                <form onSubmit={doUploadResults}>
                  <div className="field">
                    <label>Results (paste below)</label>
                    <textarea
                      className="input"
                      value={rMarkdown}
                      onChange={(e) => setRMarkdown(e.target.value)}
                      style={{ minHeight: 220, fontFamily: "var(--font-b)" }}
                      required
                    />
                  </div>
                  <button className="btn btn-primary">
                    <Icon name="plus" size={16} /> Upload results
                  </button>
                </form>
              </div>

              <div className="card admin-sec" style={{ padding: "14px 20px" }}>
                <div className="sec-title" style={{ marginBottom: 10 }}>
                  <span className="dot" /> Recent paper results
                </div>
                <div className="filter-row" style={{ marginBottom: 10 }}>
                  <span className="f-label">Grade</span>
                  <button className={"chip" + (rGrade === "all" ? " active" : "")} onClick={() => setRGrade("all")}>
                    All
                  </button>
                  {["6", "7", "8", "9", "10", "11"].map((g) => (
                    <button key={g} className={"chip" + (rGrade === g ? " active" : "")} onClick={() => setRGrade(g)}>
                      Grade {g}
                    </button>
                  ))}
                </div>
                {sortedPapers.length === 0 ? (
                  <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "10px 0" }}>
                    No results in this filter. Use the form above to upload marks.
                  </p>
                ) : (
                  sortedPapers.map((p) => {
                    const stu = students.find((s) => s.id === p.student_id);
                    return (
                      <div className="list-row" key={p.id} style={{ alignItems: "flex-start" }}>
                        <div className="who" style={{ flex: 1 }}>
                          <div className="mini">{initials(stu?.full_name || "?")}</div>
                          <div style={{ flex: 1 }}>
                            {pEdit === p.id ? (
                              <div className="grid-2" style={{ gap: 8 }}>
                                <input
                                  className="input"
                                  value={pEditForm.paper_name}
                                  onChange={(e) => setPEditForm({ ...pEditForm, paper_name: e.target.value })}
                                  placeholder="Paper name"
                                  style={{ padding: 8, fontSize: ".85rem" }}
                                />
                                <input
                                  className="input"
                                  value={pEditForm.marks}
                                  onChange={(e) => setPEditForm({ ...pEditForm, marks: e.target.value })}
                                  placeholder="Marks"
                                  type="number"
                                  style={{ padding: 8, fontSize: ".85rem" }}
                                />
                                <input
                                  className="input"
                                  value={pEditForm.total}
                                  onChange={(e) => setPEditForm({ ...pEditForm, total: e.target.value })}
                                  placeholder="Total"
                                  type="number"
                                  style={{ padding: 8, fontSize: ".85rem" }}
                                />
                                <input
                                  className="input"
                                  value={pEditForm.date}
                                  onChange={(e) => setPEditForm({ ...pEditForm, date: e.target.value })}
                                  placeholder="Date (optional)"
                                  style={{ padding: 8, fontSize: ".85rem" }}
                                />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button className="btn btn-primary btn-sm" onClick={() => doUpdatePaper(p.id)}>
                                    Save
                                  </button>
                                  <button className="btn btn-ghost btn-sm" onClick={() => setPEdit(null)}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="nm">
                                  {stu?.full_name || "Student"} · Grade {stu?.grade ?? "?"}
                                </div>
                                <div className="sub">
                                  {p.paper_name} · <b style={{ color: "var(--accent)" }}>{p.marks}/{p.total}</b>
                                  {p.date ? ` · ${p.date}` : ""}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="acts">
                          <button
                            className="icon-btn ok"
                            title="Edit"
                            onClick={() => {
                              setPEdit(p.id);
                              setPEditForm({
                                paper_name: p.paper_name,
                                marks: String(p.marks),
                                total: String(p.total),
                                date: p.date || "",
                              });
                            }}
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button className="icon-btn" title="Delete" onClick={() => doDeletePaper(p.id)}>
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {tab === "admins" && (
            <>
              <div className="card admin-sec" style={{ padding: 26 }}>
                <div className="sec-title">
                  <span className="dot" /> Add an admin
                </div>
                <p style={{ fontSize: ".84rem", color: "var(--muted)", marginBottom: 16 }}>
                  Enter a Gmail address to grant admin access. They sign in with Google on the
                  login page and land straight in the admin panel.
                </p>
                <form onSubmit={doAddAdmin} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    className="input"
                    value={aForm}
                    onChange={(e) => setAForm(e.target.value)}
                    placeholder="e.g. teacher@gmail.com"
                    type="email"
                    required
                    style={{ flex: 1, minWidth: 220 }}
                  />
                  <button className="btn btn-primary">
                    <Icon name="plus" size={16} /> Add admin
                  </button>
                </form>
              </div>

              <div className="card admin-sec" style={{ padding: "14px 20px" }}>
                <div className="sec-title" style={{ marginBottom: 6 }}>
                  <span className="dot" /> Admins ({admins.length + 1})
                </div>
                <div className="list-row">
                  <div className="who">
                    <div className="mini">
                      <Icon name="user" size={14} />
                    </div>
                    <div>
                      <div className="nm">
                        Owner <span className="pill pill-ok" style={{ marginLeft: 8 }}><span className="dot" /> primary</span>
                      </div>
                      <div className="sub">Signed in as the site owner — cannot be removed here.</div>
                    </div>
                  </div>
                </div>
                {admins.length === 0 ? (
                  <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "10px 0" }}>
                    No additional admins yet.
                  </p>
                ) : (
                  admins.map((a) => (
                    <div className="list-row" key={a.id}>
                      <div className="who">
                        <div className="mini">
                          <Icon name="user" size={14} />
                        </div>
                        <div>
                          <div className="nm">{a.email}</div>
                          <div className="sub">
                            added {new Date(a.created_at).toLocaleDateString("en-GB")}
                          </div>
                        </div>
                      </div>
                      <div className="acts">
                        <button className="icon-btn" title="Remove admin" onClick={() => doRemoveAdmin(a.id)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === "notices" && (
            <>
              <div className="card admin-sec" style={{ padding: 26 }}>
                <div className="sec-title">
                  <span className="dot" /> Publish a notice
                </div>
                <form onSubmit={doAddNotice}>
                  <div className="field">
                    <label>Title</label>
                    <input
                      className="input"
                      value={nForm.title}
                      onChange={(e) => setNForm({ ...nForm, title: e.target.value })}
                      placeholder="e.g. Results are out"
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Message</label>
                    <textarea
                      className="input"
                      value={nForm.body}
                      onChange={(e) => setNForm({ ...nForm, body: e.target.value })}
                      placeholder="e.g. Term 1 test results are now available on your dashboard."
                      required
                    />
                  </div>
                  <button className="btn btn-primary">
                    <Icon name="bell" size={16} /> Publish notice
                  </button>
                </form>
              </div>

              <div className="card admin-sec" style={{ padding: "14px 20px" }}>
                <div className="sec-title" style={{ marginBottom: 6 }}>
                  <span className="dot" /> Current notices ({notices.length})
                </div>
                {notices.length === 0 ? (
                  <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "10px 0" }}>No notices yet.</p>
                ) : (
                  notices.map((n) => (
                    <div className="list-row" key={n.id}>
                      <div className="who">
                        <div className="mini">
                          <Icon name="bell" size={14} />
                        </div>
                        <div>
                          <div className="nm">
                            {n.title}{" "}
                            {n.active ? (
                              <span className="pill pill-ok">
                                <span className="dot" /> live
                              </span>
                            ) : (
                              <span className="pill pill-bad">
                                <span className="dot" /> hidden
                              </span>
                            )}
                          </div>
                          <div className="sub">{n.body}</div>
                        </div>
                      </div>
                      <div className="acts">
                        <button className="icon-btn ok" title={n.active ? "Hide" : "Show"} onClick={() => doToggleNotice(n.id, n.active)}>
                          <Icon name={n.active ? "close" : "check"} size={14} />
                        </button>
                        <button className="icon-btn" title="Delete" onClick={() => doDeleteNotice(n.id)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ marginTop: 30, textAlign: "right" }}>
        <LogoutButton className="btn btn-ghost btn-sm" label="Sign out" />
      </div>
    </div>
  );
}
