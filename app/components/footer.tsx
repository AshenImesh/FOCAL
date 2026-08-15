import Link from "next/link";
import { Ic } from "./icons";
import type { NavUser } from "./site-nav";

export function Footer({ user }: { user: NavUser }) {
  return (
    <footer>
      <div className="foot-inner">
        <div className="foot-brand">
          <Link className="brand" href="/">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ width: 26, height: 26 }}>
              <rect width="32" height="32" rx="9" fill="url(#lg2)" />
              <circle cx="16" cy="16" r="6.6" stroke="white" strokeWidth="2.6" />
              <circle cx="16" cy="16" r="2.2" fill="white" />
              <defs>
                <linearGradient id="lg2" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#4F46E5" />
                  <stop offset="1" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
            </svg>
            FOCAL
          </Link>
          <p>Tuition science classes for grades 6–11, English medium, Sri Lanka.</p>
        </div>
        <div className="foot-cols">
          <div className="col">
            <h4>Explore</h4>
            <Link href="/dashboard">Results</Link>
            <Link href="/quiz">Quizzes</Link>
            <Link href="/board">Leaderboard</Link>
            <Link href={user ? "/dashboard" : "/login"}>Register / Login</Link>
          </div>
          <div className="col">
            <h4>Class</h4>
            <Link href="/">Grades 6–11</Link>
            <Link href="/">Science · English</Link>
            <Link href="/">Sri Lanka</Link>
          </div>
          <div className="col">
            <h4>Staff</h4>
            <Link href="/teacher">Teacher panel</Link>
          </div>
        </div>
      </div>
      <div className="foot-bottom">
        FOCAL <b>·</b> Made with care for students in Sri Lanka
      </div>
    </footer>
  );
}
