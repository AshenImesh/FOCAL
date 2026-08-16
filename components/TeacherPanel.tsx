"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addPaperResult, deletePaper, teacherLogout } from "@/lib/actions";
import { Icon } from "@/components/icons";
import type { Paper, Profile, QuizScore, Teacher } from "@/lib/types";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function TeacherPanel({ teacher }: { teacher: Teacher }) {
  const router = useRouter();
  const supabase = createClient();
  const [students, setStudents] = useState<Profile[]>([]);
  const [papers, setPapers] = useState<Record<string, Paper[]>>({});
  const [quizCount, setQuizCount] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [form, setForm] = useState({
    student_id: "",
    paper_name: "",
    marks: "",
    total: "100",
    date: "",
  });

  const load = useCallback(async () => {
    if (!supabase) return;
    const [{ data: s }, { data: p }, { data: q }] = await Promise.all([
      supabase.from("profiles").select("*").in("role", ["student"]).order("full_name"),
      supabase.from("papers").select("*").order("created_at"),
      supabase.from("quiz_scores").select("student_id"),
    ]);
    const approved = ((s || []) as Profile[]).filter((x) => x.status !== "rejected");
    setStudents(approved);
    const pmap: Record<string, Paper[]> = {};
    ((p || []) as Paper[]).forEach((pa) => {
      (pmap[pa.student_id] = pmap[pa.student_id] || []).push(pa);
    });
    setPapers(pmap);
    const qc: Record<string, number> = {};
    ((q || []) as { student_id: string }[]).forEach((row) => {
      qc[row.student_id] = (qc[row.student_id] || 0) + 1;
    });
    setQuizCount(qc);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOkMsg("");
    const fd = new FormData();
    fd.set("student_id", form.student_id);
    fd.set("paper_name", form.paper_name);
    fd.set("marks", form.marks);
    fd.set("total", form.total);
    fd.set("date", form.date);
    const res = await addPaperResult(fd);
    setBusy(false);
    if (res && "error" in res && res.error) {
      setError(res.error);
      return;
    }
    setForm((f) => ({ ...f, paper_name: "", marks: "", date: "" }));
    setOkMsg("Result added.");
    load();
    router.refresh();
  }

  async function removePaper(id: string) {
    await deletePaper(id);
    load();
    router.refresh();
  }

  async function logout() {
    await teacherLogout();
    router.refresh();
  }

  return (
    <div className="admin-wrap">
      <div className="page-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow">Teacher panel</span>
          <h1>Hi, {teacher.full_name.split(" ")[0]}</h1>
          <p>Upload paper results for your students. Changes appear on their dashboards instantly.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          <Icon name="logout" size={14} /> Sign out
        </button>
      </div>

      <div className="card admin-sec" style={{ padding: 26 }}>
        <div className="sec-title">
          <span className="dot" /> Add a paper result
        </div>
        {error && <div className="form-error">{error}</div>}
        {okMsg && (
          <div className="status-banner pending" style={{ background: "var(--good-soft)", borderColor: "var(--good-line)", color: "var(--good)" }}>
            {okMsg}
          </div>
        )}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="student_id">Student</label>
            <select
              className="input"
              id="student_id"
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              required
            >
              <option value="">— Select a student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} (Grade {s.grade})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="paper_name">Paper name</label>
            <input
              className="input"
              id="paper_name"
              value={form.paper_name}
              onChange={(e) => setForm({ ...form, paper_name: e.target.value })}
              placeholder="e.g. Paper 4 — Term 1 2026"
              required
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="marks">Marks</label>
              <input
                className="input"
                id="marks"
                type="number"
                min={0}
                value={form.marks}
                onChange={(e) => setForm({ ...form, marks: e.target.value })}
                placeholder="e.g. 82"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="total">Out of</label>
              <input
                className="input"
                id="total"
                type="number"
                min={1}
                value={form.total}
                onChange={(e) => setForm({ ...form, total: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="date">Date / term</label>
            <input
              className="input"
              id="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              placeholder="e.g. Jan 2026"
            />
          </div>
          <button className="btn btn-primary" disabled={busy}>
            <Icon name="plus" size={16} /> {busy ? "Adding…" : "Add result"}
          </button>
        </form>
      </div>

      <div className="card admin-sec" style={{ padding: "14px 20px" }}>
        <div className="sec-title" style={{ marginBottom: 6 }}>
          <span className="dot" /> Students ({students.length})
        </div>
        {students.length === 0 ? (
          <p style={{ fontSize: ".86rem", color: "var(--faint)", padding: "10px 0" }}>
            No students yet — they appear here after they register and get approved by the admin.
          </p>
        ) : (
          students.map((s) => {
            const isOpen = open === s.id;
            const list = (papers[s.id] || []).sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
            return (
              <div key={s.id}>
                <div className="list-row">
                  <div className="who">
                    <div className="mini">{initials(s.full_name || "?")}</div>
                    <div style={{ flex: 1 }}>
                      <div className="nm">
                        {s.full_name} · Grade {s.grade}
                      </div>
                      <div className="sub">
                        {s.phone ? s.phone + " · " : ""}
                        {list.length} paper{list.length !== 1 ? "s" : ""} · {quizCount[s.id] || 0} quiz
                        {quizCount[s.id] !== 1 ? "zes" : ""} ·{" "}
                        <span className={"pill " + (s.status === "approved" ? "pill-ok" : "pill-wait")}>
                          <span className="dot" /> {s.status}
                        </span>
                      </div>
                      <div className="paper-tags">
                        {list.slice(-4).map((p) => (
                          <span className="paper-tag" key={p.id}>
                            {p.paper_name} <b>{p.marks}/{p.total}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="acts">
                    <button
                      className={"expand-btn" + (isOpen ? " open" : "")}
                      onClick={() => setOpen(isOpen ? null : s.id)}
                    >
                      <Icon name="chev" size={13} /> Details
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="sub-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Paper</th>
                          <th>Date</th>
                          <th>Score</th>
                          <th>%</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {list.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ color: "var(--faint)" }}>
                              No papers uploaded yet.
                            </td>
                          </tr>
                        )}
                        {list.map((p) => (
                          <tr key={p.id}>
                            <td>{p.paper_name}</td>
                            <td>{p.date || "—"}</td>
                            <td>
                              {p.marks} / {p.total}
                            </td>
                            <td>{Math.round((p.marks / p.total) * 100)}%</td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                className="icon-btn"
                                onClick={() => removePaper(p.id)}
                                title="Delete result"
                              >
                                <Icon name="trash" size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
