import Link from "next/link";
import Image from "next/image";
import { Ic } from "./components/icons";
import { GRADES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  } catch {
    signedIn = false;
  }

  const resultsHref = signedIn ? "/dashboard" : "/login";

  return (
    <div className="view">
      <section className="hero">
        <div className="dot-grid" />
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow hero-eyebrow">
              Grades 6 – 11 · Science · English Medium
            </span>
            <h1>
              Science,<br />
              <span className="grad">in focus.</span>
            </h1>
            <p className="lead">
              Your class hub for everything science — check paper results, take
              quizzes, and see where you stand. Simple, clean, no clutter.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary" href={resultsHref}>
                <Ic.search size={17} /> View my results
              </Link>
              <Link className="btn btn-ghost" href="/quiz">
                <Ic.bolt size={17} /> Take a quiz
              </Link>
            </div>
            <div className="hero-facts">
              <div className="fact">
                <div className="num">
                  <b>6–11</b>
                </div>
                <div className="lbl">Grade range</div>
              </div>
              <div className="fact">
                <div className="num">
                  <b>2</b> boards
                </div>
                <div className="lbl">Quiz & paper</div>
              </div>
              <div className="fact">
                <div className="num">
                  <b>1</b> focus
                </div>
                <div className="lbl">Science only</div>
              </div>
              <div className="fact">
                <div className="num">LK</div>
                <div className="lbl">Sri Lanka</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="photo-frame">
              <Image
                src="/teacher.jpg"
                alt="Your FOCAL teacher"
                fill
                sizes="(max-width: 920px) 300px, 300px"
                priority
              />
              <div className="tint" />
            </div>
            <div className="hv-card">
              <div className="hv-name">Meet your teacher</div>
              <div className="hv-sub" style={{ marginBottom: 12 }}>
                FOCAL Science · Grades 6–11
              </div>
              <div className="hv-rows">
                <div className="hv-row">
                  <span className="n">Paper results</span>
                  <span className="v good">Posted here</span>
                </div>
                <div className="hv-row">
                  <span className="n">Quizzes</span>
                  <span className="v">Weekly</span>
                </div>
              </div>
            </div>
            <div className="hv-chip c1">
              <Ic.trophy size={18} />
              <span>
                Class leaderboard<small>Updated after every quiz</small>
              </span>
            </div>
            <div className="hv-chip c2">
              <Ic.bolt size={18} />
              <span>
                Learn & track<small>See your growth with charts</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="sec-head">
          <span className="eyebrow">Everything in one place</span>
          <h2>Built for your science journey</h2>
          <p>From paper scores to quiz challenges — everything is a click away.</p>
        </div>
        <div className="features">
          <Link className="feat" href={resultsHref}>
            <div className="ic">
              <Ic.search size={21} />
            </div>
            <h3>Check results</h3>
            <p>
              Log in with Gmail and see every paper score instantly — no typing
              your name every time.
            </p>
            <span className="go">→</span>
          </Link>
          <Link className="feat" href="/quiz">
            <div className="ic">
              <Ic.bolt size={21} />
            </div>
            <h3>Science quizzes</h3>
            <p>Timed quizzes for every grade with instant feedback — learn while you play.</p>
            <span className="go">→</span>
          </Link>
          <Link className="feat" href="/board">
            <div className="ic">
              <Ic.trophy size={21} />
            </div>
            <h3>Leaderboards</h3>
            <p>See how you rank against the class on the quiz board.</p>
            <span className="go">→</span>
          </Link>
          <Link className="feat" href={signedIn ? "/dashboard" : "/login"}>
            <div className="ic">
              <Ic.user size={21} />
            </div>
            <h3>Register / Login</h3>
            <p>Sign in with your Gmail — your results find you automatically.</p>
            <span className="go">→</span>
          </Link>
        </div>
      </section>

      <section className="section-tight">
        <div className="sec-head">
          <span className="eyebrow">Grades we cover</span>
          <h2>Pick your grade, start learning</h2>
          <p>One class, six grades — from the basics to the big exams.</p>
        </div>
        <div className="grade-strip">
          {GRADES.map((g) => (
            <Link key={g} className="grade-pill" href="/quiz">
              Grade {g}
              <small>Science</small>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
