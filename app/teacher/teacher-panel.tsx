"use client";

import { useState } from "react";
import { Ic } from "../components/icons";
import { useToast } from "../components/toast";
import { teacherAddResult, teacherDeleteResult, teacherLogout } from "@/lib/actions";
import { fmtDate, initials } from "@/lib/constants";

type Student = {
  id: string;
  name: string;
  grade: string;
  phone: string | null;
  email: string;
};

type ResultRow = {
  id: number;
  paper: string;
  marks: number;
  total: number;
  date: string | null;
  created_at: string;
  student_name: string;
  student_grade: string;
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

export function TeacherPanel({
  students,
  results,
  quizRows,
  username,
}: {
  students: Student[];
  results: ResultRow[];
  quizRows: QuizRow[];
  username: string;
}) {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [paper, setPaper] = useState("");
  const [marks, setMarks] = useState("");
  const [total, setTotal] = useState("100");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!studentId) return toast("Choose a student");
    if (!paper.trim()) return toast("Enter the paper name");
    setBusy(true);
    const res = await teacherAddResult({
      studentId,
      paper,
      marks: Number(marks) || 0,
      total: Number(total) || 100,
      date,
    });
    setBusy(false);
    if (!res.ok) return toast(res.error || "Could not add result");
    toast("Result added");
    setPaper("");
    setMarks("");
    setDate("");
  };

  const del = async (id: number) => {
    const res = await teacherDeleteResult(id);
    toast(res.ok ? "Result removed" : res.error || "Could not remove");
  };

  return (
    <div className="admin-wrap">
      <div className="page-head">
        <span className="eyebrow">Teacher panel</span>
        <h1>Class management</h1>
        <p>
          Signed in as <b style={{ color: "var(--ink)" }}>{username}</b>. Add
          paper results and keep an eye on your class.
        </p>
      </div>

      <div className="card admin-sec" style={{ padding: 26 }}>
        <div className="sec-title">
          <span className="dot" />
          Add a paper result
        </div>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label htmlFor="t-student">Student</label>
            <select
              id="t-student"
              className="input"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">Choose an approved student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · Grade {s.grade}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label htmlFor="t-paper">Paper name</label>
            <input
              id="t-paper"
              className="input"
              value={paper}
              onChange={(e) => setPaper(e.target.value)}
              placeholder="e.g. Paper 4 — Term 1 2026"
            />
          </div>
          <div className="field">
            <label htmlFor="t-marks">Marks</label>
            <input
              id="t-marks"
              className="input"
              type="number"
              min="0"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              placeholder="e.g. 82"
            />
          </div>
          <div className="field">
            <label htmlFor="t-total">Out of</label>
            <input
              id="t-total"
              className="input"
              type="number"
              min="1"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="t-date">Date / term</label>
            <input
              id="t-date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="e.g. Jan 2026"
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          <Ic.plus size={16} /> Add result
        </button>
      </div>

      <div className="card admin-sec" style={{ padding: 26 }}>
        <div className="sec-title">
          <span className="dot" />
          Recently added results
          <span className="count">{results.length} shown</span>
        </div>
        {results.length ? (
          results.map((r) => (
            <div className="list-row" key={r.id}>
              <div className="who">
                <div className="mini">{initials(r.student_name)}</div>
                <div>
                  <div className="nm">
                    {r.paper} · {r.student_name}{" "}
                    <span style={{ color: "var(--faint)", fontWeight: 500 }}>
                      (Grade {r.student_grade})
                    </span>
                  </div>
                  <div className="sub">
                    {r.marks}/{r.total} · {r.date || fmtDate(r.created_at)}
                  </div>
                </div>
              </div>
              <div className="actions">
                <button
                  className="icon-btn"
                  title="Delete"
                  onClick={() => del(r.id)}
                >
                  <Ic.trash size={15} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "8px 0" }}>
            No results added yet.
          </p>
        )}
      </div>

      <div className="card admin-sec" style={{ padding: 26 }}>
        <div className="sec-title">
          <span className="dot" />
          Registered students ({students.length})
        </div>
        {students.length ? (
          students.map((s) => (
            <div className="list-row" key={s.id}>
              <div className="who">
                <div className="mini">{initials(s.name)}</div>
                <div>
                  <div className="nm">{s.name}</div>
                  <div className="sub">
                    Grade {s.grade}
                    {s.phone ? ` · ${s.phone}` : ""} · {s.email}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "8px 0" }}>
            No approved students yet — the admin approves registrations.
          </p>
        )}
      </div>

      <div className="card admin-sec" style={{ padding: 26 }}>
        <div className="sec-title">
          <span className="dot" />
          Recent quiz activity
        </div>
        {quizRows.length ? (
          quizRows.map((q) => (
            <div className="list-row" key={q.id}>
              <div className="who">
                <div className="mini">{initials(q.student_name)}</div>
                <div>
                  <div className="nm">{q.student_name}</div>
                  <div className="sub">
                    Grade {q.grade} · {fmtDate(q.created_at)}
                  </div>
                </div>
              </div>
              <span className={`badge ${Number(q.pct) >= 75 ? "badge-a" : Number(q.pct) >= 40 ? "badge-c" : "badge-d"}`}>
                {q.score}/{q.total} · {Math.round(Number(q.pct))}%
              </span>
            </div>
          ))
        ) : (
          <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "8px 0" }}>
            No quizzes taken yet.
          </p>
        )}
      </div>

      <button
        className="btn btn-ghost"
        onClick={async () => {
          await teacherLogout();
          window.location.reload();
        }}
      >
        <Ic.logout size={15} /> Sign out
      </button>
    </div>
  );
}
