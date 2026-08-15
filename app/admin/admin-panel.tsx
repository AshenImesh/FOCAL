"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "../components/icons";
import { useToast } from "../components/toast";
import {
  adminAddAdmin,
  adminAddNotice,
  adminAddResult,
  adminCreateTeacher,
  adminDeleteNotice,
  adminDeleteQuizScore,
  adminDeleteResult,
  adminDeleteStudent,
  adminDeleteTeacher,
  adminRemoveAdmin,
  adminResetTeacherPassword,
  adminSetApproval,
  adminToggleNotice,
} from "@/lib/actions";
import { fmtDate, GRADES, initials } from "@/lib/constants";

type Student = {
  id: string;
  email: string;
  name: string;
  grade: string;
  phone: string | null;
  approved: boolean;
  created_at: string;
};

type Teacher = { id: number; name: string; username: string; created_at: string };
type Notice = { id: number; message: string; active: boolean; created_at: string };
type ResultRow = {
  id: number;
  paper: string;
  marks: number;
  total: number;
  date: string | null;
  created_at: string;
  student_name: string;
  student_grade: string;
  student_id: string;
};
type QuizRow = {
  id: number;
  grade: string;
  score: number;
  total: number;
  pct: number;
  created_at: string;
  student_name: string;
};

type Creds = { username: string; password: string } | null;
type Admin = { id: number; email: string; created_at: string };

export function AdminPanel({
  students,
  teachers,
  notices,
  results,
  quizRows,
  admins,
  ownerEmail,
}: {
  students: Student[];
  teachers: Teacher[];
  notices: Notice[];
  results: ResultRow[];
  quizRows: QuizRow[];
  admins: Admin[];
  ownerEmail: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const pending = students.filter((s) => !s.approved);
  const approved = students.filter((s) => s.approved);

  const refresh = () => router.refresh();
  const act = async (p: Promise<{ ok: boolean; error?: string; data?: unknown }>) => {
    const res = await p;
    if (res.ok) {
      toast("Done");
      refresh();
    } else {
      toast(res.error || "Something went wrong");
    }
    return res;
  };

  return (
    <div className="admin-wrap">
      <div className="page-head">
        <span className="eyebrow">Control panel</span>
        <h1>Admin dashboard</h1>
        <p>Registrations, results, teachers and notices — all in one place.</p>
      </div>

      <div className="stats-row">
        <div className="mini-stat">
          <div className="n">{students.length}</div>
          <div className="l">Total students</div>
        </div>
        <div className="mini-stat">
          <div className="n warn">{pending.length}</div>
          <div className="l">Pending approval</div>
        </div>
        <div className="mini-stat">
          <div className="n accent">{approved.length}</div>
          <div className="l">Approved</div>
        </div>
        <div className="mini-stat">
          <div className="n">{teachers.length}</div>
          <div className="l">Teachers</div>
        </div>
        <div className="mini-stat">
          <div className="n">{quizRows.length}</div>
          <div className="l">Quizzes taken</div>
        </div>
        <div className="mini-stat">
          <div className="n">{notices.filter((n) => n.active).length}</div>
          <div className="l">Active notices</div>
        </div>
      </div>

      <RegistrationRequests pending={pending} act={act} />
      <StudentsSection students={students} act={act} />
      <ResultsSection
        students={approved}
        results={results}
        act={act}
      />
      <QuizSection quizRows={quizRows} act={act} />
      <TeachersSection teachers={teachers} act={act} />
      <AdminsSection admins={admins} ownerEmail={ownerEmail} act={act} />
      <NoticesSection notices={notices} act={act} />
    </div>
  );
}

function SectionTitle({
  dot = true,
  children,
  count,
}: {
  dot?: boolean;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <div className="sec-title">
      {dot && <span className="dot" />}
      {children}
      {count !== undefined && <span className="count">{count}</span>}
    </div>
  );
}

/* ── Registration requests ──────────────────────────── */
function RegistrationRequests({
  pending,
  act,
}: {
  pending: Student[];
  act: (p: Promise<{ ok: boolean; error?: string; data?: unknown }>) => Promise<{ ok: boolean; error?: string; data?: unknown }>;
}) {
  return (
    <div className="card admin-sec" style={{ padding: 26 }}>
      <SectionTitle count={pending.length}>Registration requests</SectionTitle>
      {pending.length ? (
        pending.map((s) => (
          <div className="list-row" key={s.id}>
            <div className="who">
              <div className="mini">{initials(s.name)}</div>
              <div>
                <div className="nm">{s.name}</div>
                <div className="sub">
                  Grade {s.grade} · {s.email}
                  {s.phone ? ` · ${s.phone}` : ""} · joined {fmtDate(s.created_at)}
                </div>
              </div>
            </div>
            <div className="actions">
              <button
                className="icon-btn ok"
                title="Approve"
                onClick={() => act(adminSetApproval(s.id, true))}
              >
                <Ic.check size={15} />
              </button>
              <button
                className="icon-btn"
                title="Reject"
                onClick={() => act(adminDeleteStudent(s.id))}
              >
                <Ic.trash size={15} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "8px 0" }}>
          No pending registrations. New sign-ups appear here for approval.
        </p>
      )}
    </div>
  );
}

/* ── Students ───────────────────────────────────────── */
function StudentsSection({
  students,
  act,
}: {
  students: Student[];
  act: (p: Promise<{ ok: boolean; error?: string; data?: unknown }>) => Promise<{ ok: boolean; error?: string; data?: unknown }>;
}) {
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.grade === term
    );
  }, [students, q]);

  return (
    <div className="card admin-sec" style={{ padding: 26 }}>
      <SectionTitle count={students.length}>All students</SectionTitle>
      <div className="field" style={{ marginBottom: 14 }}>
        <input
          className="input"
          placeholder="Search by name, email or grade…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {filtered.length ? (
        filtered.map((s) => (
          <div className="list-row" key={s.id}>
            {editId === s.id ? (
              <EditStudentRow student={s} onDone={() => setEditId(null)} />
            ) : (
              <>
                <div className="who">
                  <div className="mini">{initials(s.name)}</div>
                  <div>
                    <div className="nm">
                      {s.name}{" "}
                      <span className={`badge ${s.approved ? "badge-ok" : "badge-wait"}`}>
                        {s.approved ? "Approved" : "Pending"}
                      </span>
                    </div>
                    <div className="sub">
                      Grade {s.grade} · {s.email}
                      {s.phone ? ` · ${s.phone}` : ""}
                    </div>
                  </div>
                </div>
                <div className="actions">
                  {!s.approved ? (
                    <button
                      className="icon-btn ok"
                      title="Approve"
                      onClick={() => act(adminSetApproval(s.id, true))}
                    >
                      <Ic.check size={15} />
                    </button>
                  ) : (
                    <button
                      className="icon-btn warn"
                      title="Unapprove"
                      onClick={() => act(adminSetApproval(s.id, false))}
                    >
                      <Ic.user size={15} />
                    </button>
                  )}
                  <button
                    className="icon-btn warn"
                    title="Edit"
                    onClick={() => setEditId(s.id)}
                  >
                    <Ic.edit size={15} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Delete"
                    onClick={() => act(adminDeleteStudent(s.id))}
                  >
                    <Ic.trash size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      ) : (
        <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "8px 0" }}>
          No students match your search.
        </p>
      )}
    </div>
  );
}

function EditStudentRow({
  student,
  onDone,
}: {
  student: Student;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(student.name);
  const [grade, setGrade] = useState(student.grade);
  const [phone, setPhone] = useState(student.phone || "");

  const save = async () => {
    const { adminUpdateStudent } = await import("@/lib/actions");
    const res = await adminUpdateStudent(student.id, { name, grade, phone });
    toast(res.ok ? "Student updated" : res.error || "Update failed");
    if (res.ok) onDone();
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
      <input
        className="input"
        style={{ maxWidth: 180 }}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select className="input" style={{ maxWidth: 110 }} value={grade} onChange={(e) => setGrade(e.target.value)}>
        {GRADES.map((g) => (
          <option key={g} value={g}>
            Grade {g}
          </option>
        ))}
      </select>
      <input
        className="input"
        style={{ maxWidth: 170 }}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional)"
      />
      <button className="icon-btn ok" title="Save" onClick={save}>
        <Ic.check size={15} />
      </button>
      <button className="icon-btn" title="Cancel" onClick={onDone}>
        <Ic.x size={15} />
      </button>
    </div>
  );
}

/* ── Results ────────────────────────────────────────── */
function ResultsSection({
  students,
  results,
  act,
}: {
  students: Student[];
  results: ResultRow[];
  act: (p: Promise<{ ok: boolean; error?: string; data?: unknown }>) => Promise<{ ok: boolean; error?: string; data?: unknown }>;
}) {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [paper, setPaper] = useState("");
  const [marks, setMarks] = useState("");
  const [total, setTotal] = useState("100");
  const [date, setDate] = useState("");

  const submit = async () => {
    if (!studentId) return toast("Choose a student");
    if (!paper.trim()) return toast("Enter the paper name");
    const res = await act(
      adminAddResult({
        studentId,
        paper,
        marks: Number(marks) || 0,
        total: Number(total) || 100,
        date,
      })
    );
    if (res.ok) {
      setPaper("");
      setMarks("");
      setDate("");
    }
  };

  return (
    <div className="card admin-sec" style={{ padding: 26 }}>
      <SectionTitle>Paper results</SectionTitle>
      <div className="form-grid">
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <label>Student</label>
          <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Choose a student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · Grade {s.grade}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <label>Paper name</label>
          <input
            className="input"
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            placeholder="e.g. Paper 4 — Term 1 2026"
          />
        </div>
        <div className="field">
          <label>Marks</label>
          <input
            className="input"
            type="number"
            min="0"
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Out of</label>
          <input
            className="input"
            type="number"
            min="1"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Date / term</label>
          <input
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="e.g. Jan 2026"
          />
        </div>
      </div>
      <button className="btn btn-primary" onClick={submit}>
        <Ic.plus size={16} /> Add result
      </button>

      <div style={{ marginTop: 22 }}>
        <div className="table-title">Recently added ({results.length} shown)</div>
        {results.length ? (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Paper</th>
                  <th>Score</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: "var(--ink)", fontWeight: 600 }}>
                      {r.student_name}{" "}
                      <span style={{ color: "var(--faint)", fontWeight: 500 }}>
                        (G{r.student_grade})
                      </span>
                    </td>
                    <td>{r.paper}</td>
                    <td>
                      {r.marks}/{r.total}
                    </td>
                    <td style={{ color: "var(--faint)" }}>{r.date || fmtDate(r.created_at)}</td>
                    <td>
                      <button
                        className="icon-btn"
                        title="Delete"
                        onClick={() => act(adminDeleteResult(r.id))}
                      >
                        <Ic.trash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "8px 0" }}>
            No results yet.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Quiz scores ────────────────────────────────────── */
function QuizSection({
  quizRows,
  act,
}: {
  quizRows: QuizRow[];
  act: (p: Promise<{ ok: boolean; error?: string; data?: unknown }>) => Promise<{ ok: boolean; error?: string; data?: unknown }>;
}) {
  return (
    <div className="card admin-sec" style={{ padding: 26 }}>
      <SectionTitle count={quizRows.length}>Quiz scores</SectionTitle>
      {quizRows.length ? (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Grade</th>
                <th>Score</th>
                <th>%</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {quizRows.map((q) => (
                <tr key={q.id}>
                  <td style={{ color: "var(--ink)", fontWeight: 600 }}>{q.student_name}</td>
                  <td>Grade {q.grade}</td>
                  <td>
                    {q.score}/{q.total}
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--ink)" }}>
                    {Math.round(Number(q.pct))}%
                  </td>
                  <td style={{ color: "var(--faint)" }}>{fmtDate(q.created_at)}</td>
                  <td>
                    <button
                      className="icon-btn"
                      title="Delete"
                      onClick={() => act(adminDeleteQuizScore(q.id))}
                    >
                      <Ic.trash size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "8px 0" }}>
          No quizzes taken yet.
        </p>
      )}
    </div>
  );
}

/* ── Teachers ───────────────────────────────────────── */
function TeachersSection({
  teachers,
  act,
}: {
  teachers: Teacher[];
  act: (p: Promise<{ ok: boolean; error?: string; data?: unknown }>) => Promise<{ ok: boolean; error?: string; data?: unknown }>;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [creds, setCreds] = useState<Creds>(null);
  const [resetCreds, setResetCreds] = useState<Creds & { id: number } | null>(null);

  const create = async () => {
    if (!name.trim()) return toast("Enter the teacher's name");
    const res = await act(adminCreateTeacher(name));
    if (res.ok && res.data && typeof res.data === "object" && "password" in res.data) {
      const d = res.data as unknown as { username: string; password: string };
      setCreds({ username: d.username, password: d.password });
      setName("");
    }
  };

  const reset = async (id: number) => {
    const res = await act(adminResetTeacherPassword(id));
    if (res.ok && res.data && typeof res.data === "object" && "password" in res.data) {
      const d = res.data as unknown as { password: string };
      const t = teachers.find((x) => x.id === id);
      setResetCreds({ id, username: t?.username ?? "", password: d.password });
    }
  };

  const copy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      toast("Copied to clipboard");
    } catch {
      toast("Could not copy — select it manually");
    }
  };

  return (
    <div className="card admin-sec" style={{ padding: 26 }}>
      <SectionTitle count={teachers.length}>Teachers</SectionTitle>

      <div className="field">
        <label>Register a new teacher</label>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name, e.g. Jayantha Perera"
          />
          <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={create}>
            <Ic.plus size={16} /> Add teacher
          </button>
        </div>
      </div>

      {creds && (
        <div className="creds-box">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <b style={{ color: "var(--good)" }}>Teacher created — share these once:</b>
            <button
              className="icon-btn ok"
              title="Close"
              onClick={() => setCreds(null)}
            >
              <Ic.x size={14} />
            </button>
          </div>
          <div className="c-row">
            <span className="c-label">Username</span>
            <code>{creds.username}</code>
            <button className="icon-btn ok" title="Copy" onClick={() => copy(creds.username)}>
              <Ic.copy size={14} />
            </button>
          </div>
          <div className="c-row">
            <span className="c-label">Password</span>
            <code>{creds.password}</code>
            <button className="icon-btn ok" title="Copy" onClick={() => copy(creds.password)}>
              <Ic.copy size={14} />
            </button>
          </div>
        </div>
      )}

      {resetCreds && (
        <div className="creds-box" style={{ background: "var(--warn-soft)", borderColor: "var(--warn-line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <b style={{ color: "var(--warn)" }}>Password reset for {resetCreds.username}:</b>
            <button className="icon-btn warn" title="Close" onClick={() => setResetCreds(null)}>
              <Ic.x size={14} />
            </button>
          </div>
          <div className="c-row">
            <span className="c-label">Password</span>
            <code>{resetCreds.password}</code>
            <button className="icon-btn warn" title="Copy" onClick={() => copy(resetCreds.password)}>
              <Ic.copy size={14} />
            </button>
          </div>
        </div>
      )}

      {teachers.length ? (
        teachers.map((t) => (
          <div className="list-row" key={t.id}>
            <div className="who">
              <div className="mini">{initials(t.name)}</div>
              <div>
                <div className="nm">{t.name}</div>
                <div className="sub">
                  @{t.username} · added {fmtDate(t.created_at)}
                </div>
              </div>
            </div>
            <div className="actions">
              <button
                className="icon-btn warn"
                title="Reset password"
                onClick={() => reset(t.id)}
              >
                <Ic.eye size={15} />
              </button>
              <button
                className="icon-btn"
                title="Delete"
                onClick={() => act(adminDeleteTeacher(t.id))}
              >
                <Ic.trash size={15} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "8px 0" }}>
          No teachers yet. Add one above and they can sign in to the teacher panel.
        </p>
      )}
    </div>
  );
}

/* ── Admins ─────────────────────────────────────────── */
function AdminsSection({
  admins,
  ownerEmail,
  act,
}: {
  admins: Admin[];
  ownerEmail: string;
  act: (p: Promise<{ ok: boolean; error?: string; data?: unknown }>) => Promise<{ ok: boolean; error?: string; data?: unknown }>;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const add = async () => {
    if (!email.trim()) return toast("Enter an email address");
    const res = await act(adminAddAdmin(email));
    if (res.ok) setEmail("");
  };

  return (
    <div className="card admin-sec" style={{ padding: 26 }}>
      <SectionTitle count={admins.length + (ownerEmail ? 1 : 0)}>Admins</SectionTitle>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", marginBottom: 14 }}>
        These Gmail accounts can also open the admin panel. Add anyone who needs
        access — they will still sign in with their own Google account.
      </p>

      <div className="field">
        <label>Add an admin email</label>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@gmail.com"
          />
          <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={add}>
            <Ic.plus size={16} /> Add admin
          </button>
        </div>
      </div>

      {ownerEmail && (
        <div className="list-row">
          <div className="who">
            <div className="mini">{initials(ownerEmail)}</div>
            <div>
              <div className="nm">
                {ownerEmail}{" "}
                <span className="badge badge-ok">Owner</span>
              </div>
              <div className="sub">Set as ADMIN_EMAIL — always has access</div>
            </div>
          </div>
          <div className="actions">
            <span style={{ fontSize: ".8rem", color: "var(--faint)" }}>locked</span>
          </div>
        </div>
      )}

      {admins.length ? (
        admins.map((a) => (
          <div className="list-row" key={a.id}>
            <div className="who">
              <div className="mini">{initials(a.email)}</div>
              <div>
                <div className="nm">{a.email}</div>
                <div className="sub">added {fmtDate(a.created_at)}</div>
              </div>
            </div>
            <div className="actions">
              <button
                className="icon-btn"
                title="Remove admin"
                onClick={() => act(adminRemoveAdmin(a.email))}
              >
                <Ic.trash size={15} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "8px 0" }}>
          No extra admins yet. Add one above.
        </p>
      )}
    </div>
  );
}

/* ── Notices ────────────────────────────────────────── */
function NoticesSection({
  notices,
  act,
}: {
  notices: Notice[];
  act: (p: Promise<{ ok: boolean; error?: string; data?: unknown }>) => Promise<{ ok: boolean; error?: string; data?: unknown }>;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");

  const add = async () => {
    if (!message.trim()) return toast("Enter a message");
    const res = await act(adminAddNotice(message));
    if (res.ok) setMessage("");
  };

  return (
    <div className="card admin-sec" style={{ padding: 26 }}>
      <SectionTitle count={notices.length}>Notice banner</SectionTitle>
      <p style={{ fontSize: ".82rem", color: "var(--muted)", marginBottom: 14 }}>
        Active notices appear in the banner at the top of the website — for
        example “New term starts Monday”, “Paper results are out” or “Free trial
        classes this week”.
      </p>
      <div className="field">
        <label>New notice</label>
        <textarea
          className="input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. New classes for the coming term start next week — register now!"
          style={{ minHeight: 80 }}
        />
      </div>
      <button className="btn btn-primary" onClick={add}>
        <Ic.plus size={16} /> Post notice
      </button>

      {notices.length ? (
        <div style={{ marginTop: 20 }}>
          {notices.map((n) => (
            <div className="list-row" key={n.id}>
              <div className="who">
                <span className={`badge ${n.active ? "badge-ok" : "badge-wait"}`}>
                  {n.active ? "Live" : "Paused"}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="nm" style={{ overflowWrap: "anywhere" }}>
                    {n.message}
                  </div>
                  <div className="sub">{fmtDate(n.created_at)}</div>
                </div>
              </div>
              <div className="actions">
                <button
                  className="icon-btn warn"
                  title={n.active ? "Pause" : "Activate"}
                  onClick={() => act(adminToggleNotice(n.id, !n.active))}
                >
                  {n.active ? <Ic.eye size={15} /> : <Ic.bell size={15} />}
                </button>
                <button
                  className="icon-btn"
                  title="Delete"
                  onClick={() => act(adminDeleteNotice(n.id))}
                >
                  <Ic.trash size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "8px 0" }}>
          No notices yet.
        </p>
      )}
    </div>
  );
}
