import Link from "next/link";
import { Icon } from "@/components/icons";
import TeacherPhoto from "@/components/TeacherPhoto";
import HomeLeaderboard from "@/components/HomeLeaderboard";

const GRADES = ["6", "7", "8", "9", "10", "11"];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="dot-grid" />
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow hero-eyebrow">Grades 6 – 11 · Science · English Medium</span>
            <h1>
              Science,<br />
              <span className="grad">in focus.</span>
            </h1>
            <p className="lead">
              Your class hub for everything science — check paper results, take quizzes, and see
              where you stand. Simple, clean, no clutter.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary" href="/login">
                <Icon name="search" size={17} /> Log in to see results
              </Link>
              <Link className="btn btn-ghost" href="/login">
                <Icon name="bolt" size={17} /> Take a quiz
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
                <div className="lbl">Quiz &amp; paper</div>
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
            <div className="photo-card">
              <div className="photo-frame">
                <div className="ph-blob" />
                <TeacherPhoto />
              </div>
              <div className="photo-name">Your science teacher</div>
              <div className="photo-sub">FOCAL Classes · Grades 6–11</div>
            </div>
            <div className="hv-chip c1">
              <Icon name="trophy" size={18} />
              <span>
                Hall of fame<small>Quiz &amp; paper boards</small>
              </span>
            </div>
            <div className="hv-chip c2">
              <Icon name="grad" size={18} />
              <span>
                Personal analysis<small>Trends &amp; predictions</small>
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
          <Link className="feat" href="/login">
            <div className="ic">
              <Icon name="search" size={21} />
            </div>
            <h3>Check results</h3>
            <p>Log in with your Gmail and see every paper score, quiz history and analysis.</p>
            <span className="go">→</span>
          </Link>
          <Link className="feat" href="/login">
            <div className="ic">
              <Icon name="bolt" size={21} />
            </div>
            <h3>Science quizzes</h3>
            <p>Timed quizzes for every grade with instant feedback — learn while you play.</p>
            <span className="go">→</span>
          </Link>
          <Link className="feat" href="/board">
            <div className="ic">
              <Icon name="trophy" size={21} />
            </div>
            <h3>Leaderboards</h3>
            <p>Two boards — quiz champions and top paper scorers. See how you rank.</p>
            <span className="go">→</span>
          </Link>
          <Link className="feat" href="/login">
            <div className="ic">
              <Icon name="chart" size={21} />
            </div>
            <h3>Performance analysis</h3>
            <p>Charts of your progress and a prediction of what comes next.</p>
            <span className="go">→</span>
          </Link>
        </div>
      </section>

      <HomeLeaderboard />

      <section className="section-tight">
        <div className="sec-head">
          <span className="eyebrow">Grades we cover</span>
          <h2>Pick your grade, start learning</h2>
          <p>One class, six grades — from the basics to the big exams.</p>
        </div>
        <div className="grade-strip">
          {GRADES.map((g) => (
            <Link key={g} className="grade-pill" href="/login">
              Grade {g}
              <small>Science</small>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
