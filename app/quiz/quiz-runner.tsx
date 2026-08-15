"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ic } from "../components/icons";
import { useToast } from "../components/toast";
import { createClient } from "@/lib/supabase/client";
import { GRADES, gradeOfPct, initials, shuffle } from "@/lib/constants";
import { quizForGrade } from "@/lib/questions";
import type { Question } from "@/lib/types";

type Answer = { q: string; ok: boolean };
type Stage = "setup" | "run" | "done";

const SECONDS = 30;
const QUIZ_LEN = 10;
const LETTERS = ["A", "B", "C", "D"];

export function QuizRunner({ userId, name }: { userId: string; name: string }) {
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>("setup");
  const [grade, setGrade] = useState("");
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [saved, setSaved] = useState(false);

  const listRef = useRef<Question[]>([]);
  const runGradeRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerInFlight = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const start = () => {
    if (!grade) return toast("Pick your grade first");
    listRef.current = shuffle(quizForGrade(grade)).slice(0, QUIZ_LEN);
    runGradeRef.current = grade;
    setStage("run");
    setIdx(0);
    setScore(0);
    setAnswers([]);
    setLocked(false);
    setSelected(null);
    setRevealed(null);
    setFeedback(null);
    setSaved(false);
    setTimeLeft(SECONDS);
  };

  const reset = () => {
    clearTimer();
    answerInFlight.current = false;
    setStage("setup");
    setGrade("");
  };

  const finish = useCallback(
    async (finalScore: number, finalAnswers: Answer[]) => {
      clearTimer();
      answerInFlight.current = false;
      const total = listRef.current.length;
      setStage("done");
      try {
        const pct = Math.round((finalScore / total) * 100);
        const supabase = createClient();
        const { error } = await supabase.from("quiz_scores").insert({
          student_id: userId,
          grade: runGradeRef.current,
          score: finalScore,
          total,
          pct,
        });
        if (error) throw error;
        setSaved(true);
      } catch {
        toast("Could not save your score — but well done anyway!");
      }
    },
    [clearTimer, toast, userId]
  );

  const handleAnswer = useCallback(
    (optIdx: number) => {
      const list = listRef.current;
      if (!list.length || locked || answerInFlight.current) return;
      answerInFlight.current = true;
      clearTimer();
      setLocked(true);

      const q = list[idx];
      const ok = optIdx === q.a;
      const nextScore = score + (ok ? 1 : 0);
      const nextAnswers = [...answers, { q: q.q, ok }];
      setSelected(optIdx);
      setScore(nextScore);
      setAnswers(nextAnswers);
      setRevealed(q.a);
      setFeedback({ ok, text: q.f });

      setTimeout(() => {
        if (idx + 1 >= list.length) {
          finish(nextScore, nextAnswers);
        } else {
          setLocked(false);
          setSelected(null);
          setRevealed(null);
          setFeedback(null);
          setIdx(idx + 1);
          setTimeLeft(SECONDS);
          answerInFlight.current = false;
        }
      }, 1600);
    },
    [answers, clearTimer, finish, idx, locked, score]
  );

  // countdown per question
  useEffect(() => {
    if (stage !== "run") return;
    clearTimer();
    setTimeLeft(SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          handleAnswer(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stage, idx, clearTimer, handleAnswer]);

  /* ── Setup ─────────────────────────────────────────── */
  if (stage === "setup") {
    return (
      <div className="quiz-wrap">
        <div className="page-head">
          <span className="eyebrow">Science quizzes</span>
          <h1>Test yourself</h1>
          <p>
            Pick your grade and take a timed {QUIZ_LEN}-question quiz. Your best
            score lands on the leaderboard.
          </p>
        </div>
        <div className="card" style={{ padding: 28 }}>
          <div className="field">
            <label>Playing as</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="initials" style={{ width: 40, height: 40, fontSize: ".9rem" }}>
                {initials(name)}
              </div>
              <span style={{ fontWeight: 600, fontSize: ".95rem" }}>{name}</span>
            </div>
          </div>
          <div className="field">
            <label>Your grade</label>
            <div className="chips">
              {GRADES.map((g) => (
                <button
                  key={g}
                  className={`chip ${grade === g ? "active" : ""}`}
                  onClick={() => setGrade(g)}
                >
                  Grade {g}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-block" onClick={start}>
            <Ic.bolt size={17} /> Start quiz
          </button>
        </div>
      </div>
    );
  }

  /* ── Done ──────────────────────────────────────────── */
  if (stage === "done") {
    const total = listRef.current.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const emoji = pct >= 80 ? "🎉" : pct >= 60 ? "👏" : pct >= 40 ? "💪" : "📖";
    const badge = gradeOfPct(pct);
    const badgeLabel =
      pct >= 75
        ? "Excellent — A"
        : pct >= 60
          ? "Good — B"
          : pct >= 40
            ? "Keep going — C"
            : "Needs work — D";
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
              {score}
              <small>/{total}</small>
            </div>
            <div className="done-pct">
              {pct}% correct · Grade {runGradeRef.current}
            </div>
            <div className="done-name">{name}</div>
            <div>
              <span className={`done-badge ${badge.cls}`}>{badgeLabel}</span>
            </div>
          </div>
          <div className="done-body">
            <div className="breakdown">
              {answers.map((a, i) => (
                <div className="br-row" key={i}>
                  <div
                    className="br-num"
                    style={{
                      background: a.ok ? "var(--good-soft)" : "var(--bad-soft)",
                      color: a.ok ? "var(--good)" : "var(--bad)",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="br-q">{a.q}</div>
                  <div className={`br-mark ${a.ok ? "ok" : "no"}`}>{a.ok ? "✓" : "✗"}</div>
                </div>
              ))}
            </div>
            <div className="done-actions">
              <button className="btn btn-primary" onClick={reset}>
                Try again
              </button>
              <Link className="btn btn-ghost" href="/board" style={{ flex: 1 }}>
                <Ic.trophy size={17} /> View leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Running ───────────────────────────────────────── */
  const list = listRef.current;
  const q = list[idx];
  const urgent = timeLeft <= 8;
  const pct = Math.round((idx / list.length) * 100);

  return (
    <div className="quiz-wrap">
      <div className="qt-bar">
        <div className="qt-meta">
          Question <b>{idx + 1}</b> of <b>{list.length}</b> · Grade{" "}
          <b>{runGradeRef.current}</b>
        </div>
        <div className={`timer ${urgent ? "urgent" : ""}`}>
          <Ic.clock size={15} />{" "}
          <span>0:{String(Math.max(0, timeLeft)).padStart(2, "0")}</span>
        </div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="card qcard">
        <div className="qnum">Question {idx + 1}</div>
        <div className="qtext">{q.q}</div>
        <div className="opts">
          {q.o.map((opt, i) => {
            let cls = "opt";
            if (revealed !== null) {
              if (i === revealed) cls += " correct";
              else if (i === selected && i !== revealed) cls += " wrong";
            } else if (i === selected) {
              cls += " selected";
            }
            return (
              <button
                key={i}
                className={cls}
                disabled={locked}
                onClick={() => handleAnswer(i)}
              >
                <span className="letter">{LETTERS[i]}</span>
                {opt}
              </button>
            );
          })}
        </div>
        {feedback && (
          <div className={`feedback show ${feedback.ok ? "f-correct" : "f-wrong"}`}>
            {feedback.ok ? "✓ Correct! " : "✗ Not quite. "}
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
}
