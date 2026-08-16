"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { submitQuiz } from "@/lib/actions";
import { Icon } from "@/components/icons";
import type { QuizQuestion } from "@/lib/types";

const GRADES = ["6", "7", "8", "9", "10", "11"];
const LETTERS = ["A", "B", "C", "D"];
const TIME_PER_Q = 30;

type Phase = "setup" | "playing" | "done";
type Result = { score: number; total: number; pct: number; breakdown: { qid: string; ok: boolean }[] };

export default function QuizPlayer({ profileName, profileGrade }: { profileName: string; profileGrade: number | null }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [grade, setGrade] = useState(profileGrade ? String(profileGrade) : "");
  const [lockedGrade] = useState(profileGrade != null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<{ qid: string; selected: number }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const q = questions[idx];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  function startQuiz() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    supabase
      .from("quiz_questions")
      .select("id, grade, question, options, answer, feedback")
      .eq("grade", Number(grade))
      .then(
        ({ data, error }: { data: QuizQuestion[] | null; error: { message: string } | null }) => {
          setBusy(false);
          if (error) {
            setError(error.message);
            return;
          }
          const pool = (data || []) as QuizQuestion[];
          if (!pool.length) {
            setError("No questions for this grade yet.");
            return;
          }
          const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
          setQuestions(picked);
          setIdx(0);
          setAnswers([]);
          setSelected(null);
          setLocked(false);
          setPhase("playing");
        }
      );
  }

  useEffect(() => {
    if (phase !== "playing" || !q) return;
    setTimeLeft(TIME_PER_Q);
    setSelected(null);
    setLocked(false);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          setLocked((prev) => {
            if (!prev) timeUp();
            return true;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase, idx, q, clearTimer]);

  function timeUp() {
    setAnswers((a) => [...a, { qid: q.id, selected: -1 }]);
    setLocked(true);
  }

  function selectAnswer(i: number) {
    if (locked) return;
    clearTimer();
    setSelected(i);
    setLocked(true);
    setAnswers((a) => [...a, { qid: q.id, selected: i }]);
  }

  function next() {
    if (idx + 1 >= questions.length) {
      finish();
    } else {
      setIdx(idx + 1);
    }
  }

  async function finish() {
    setBusy(true);
    const res = await submitQuiz({ grade: Number(grade), answers });
    setBusy(false);
    if (res && "error" in res && res.error) {
      setError(res.error);
      return;
    }
    setResult(res as Result);
    setSaved(true);
    setPhase("done");
    router.refresh();
  }

  /* ── setup ── */
  if (phase === "setup") {
    return (
      <div className="quiz-wrap">
        <div className="page-head">
          <span className="eyebrow">Science quizzes</span>
          <h1>Test yourself</h1>
          <p>
            {profileName}, take a timed 10-question quiz for your grade. Your best score lands on
            the leaderboard.
          </p>
        </div>
        <div className="card" style={{ padding: 28 }}>
          {error && <div className="form-error">{error}</div>}
          {lockedGrade ? (
            <div className="field">
              <label>Your grade</label>
              <div className="chips">
                <span className="chip active" style={{ cursor: "default" }}>
                  Grade {profileGrade}
                </span>
                <span className="quiz-lock-note">
                  <Icon name="lock" size={13} /> Quizzes are matched to your grade.
                </span>
              </div>
            </div>
          ) : (
            <div className="field">
              <label>Your grade</label>
              <div className="chips">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    className={"chip" + (grade === g ? " active" : "")}
                    onClick={() => setGrade(g)}
                  >
                    Grade {g}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="btn btn-primary btn-block" onClick={startQuiz} disabled={busy || !grade}>
            <Icon name="bolt" size={17} /> {busy ? "Loading questions…" : "Start quiz"}
          </button>
        </div>
      </div>
    );
  }

  /* ── done ── */
  if (phase === "done" && result) {
    const emoji = result.pct >= 80 ? "🎉" : result.pct >= 60 ? "👏" : result.pct >= 40 ? "💪" : "📖";
    const badge =
      result.pct >= 75
        ? { l: "Excellent — A", c: "badge-a" }
        : result.pct >= 60
          ? { l: "Good — B", c: "badge-b" }
          : result.pct >= 40
            ? { l: "Keep going — C", c: "badge-c" }
            : { l: "Needs work — D", c: "badge-d" };
    const correct = new Set(result.breakdown.filter((b) => b.ok).map((b) => b.qid));
    return (
      <div className="quiz-wrap">
        <div className="page-head" style={{ textAlign: "center", marginBottom: 28 }}>
          <span className="eyebrow">Quiz complete</span>
          <h1>Well done!</h1>
        </div>
        <div className="card done-card">
          <div className="done-top">
            <div className="done-emoji">{emoji}</div>
            <div className="done-score">
              {result.score}
              <small>/{result.total}</small>
            </div>
            <div className="done-pct">{result.pct}% correct · Grade {grade}</div>
            <div className="done-name">{profileName}</div>
            <div>
              <span className={"done-badge " + badge.c}>{badge.l}</span>
            </div>
          </div>
          <div className="done-body">
            <div className="breakdown">
              {questions.map((qq, i) => {
                const ok = correct.has(qq.id);
                return (
                  <div className="br-row" key={qq.id}>
                    <div
                      className="br-num"
                      style={{
                        background: ok ? "var(--good-soft)" : "var(--bad-soft)",
                        color: ok ? "var(--good)" : "var(--bad)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="br-q">{qq.question}</div>
                    <div className={"br-mark " + (ok ? "ok" : "no")}>{ok ? "✓" : "✗"}</div>
                  </div>
                );
              })}
            </div>
            <div className="done-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setPhase("setup");
                  setResult(null);
                  setSaved(false);
                }}
              >
                Try again
              </button>
              <Link className="btn btn-ghost" href="/board" style={{ flex: 1 }}>
                <Icon name="trophy" size={17} /> View leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── playing ── */
  if (!q) return null;
  const correctIdx = q.answer;
  return (
    <div className="quiz-wrap">
      <div className="qt-bar">
        <div className="qt-meta">
          Question <b>{idx + 1}</b> of <b>{questions.length}</b> · Grade <b>{grade}</b>
        </div>
        <div className={"timer" + (timeLeft <= 8 ? " urgent" : "")}>
          <Icon name="clock" size={15} /> 0:{String(Math.max(0, timeLeft)).padStart(2, "0")}
        </div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: (idx / questions.length) * 100 + "%" }} />
      </div>
      <div className="card qcard">
        <div className="qnum">Question {idx + 1}</div>
        <div className="qtext">{q.question}</div>
        <div className="opts">
          {(q.options as string[]).map((opt, i) => {
            let cls = "opt";
            if (selected != null && locked) {
              if (i === correctIdx) cls += " correct";
              else if (i === selected) cls += " wrong";
              else cls += " dim";
            } else if (selected === i) {
              cls += " selected";
            }
            return (
              <button key={i} className={cls} onClick={() => selectAnswer(i)} disabled={locked}>
                <span className="letter">{LETTERS[i]}</span>
                {opt}
              </button>
            );
          })}
        </div>
        {locked && (
          <div className={"feedback show " + (selected === correctIdx ? "f-correct" : "f-wrong")}>
            {selected === correctIdx ? "✓ Correct! " : "✗ Not quite. "}
            {q.feedback}
          </div>
        )}
        {locked && (
          <button className="btn btn-primary btn-block" onClick={next} disabled={busy}>
            {busy ? "Saving…" : idx + 1 >= questions.length ? "See my results →" : "Next question →"}
          </button>
        )}
      </div>
    </div>
  );
}
