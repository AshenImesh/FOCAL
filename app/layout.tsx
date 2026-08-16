import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Icon, BrandMark } from "@/components/icons";
import { NavLinks, BottomNav, type NavItem } from "@/components/NavLinks";
import LogoutButton from "@/components/LogoutButton";
import NoticeBanner from "@/components/NoticeBanner";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = {
  title: "FOCAL — Science Classes · Grades 6–11",
  description:
    "FOCAL — tuition science classes for grades 6–11 (English medium, Sri Lanka). Check results, take quizzes, climb the leaderboard.",
};

export const viewport: Viewport = {
  themeColor: "#F4F5FA",
};

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "home", active: "" },
  { href: "/dashboard", label: "Results", icon: "bars", active: "dashboard" },
  { href: "/quiz", label: "Quiz", icon: "bolt", active: "quiz" },
  { href: "/board", label: "Board", icon: "trophy", active: "board" },
];

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  let user = null;
  let profile: Profile | null = null;
  let notices: { id: string; title: string; body: string; active: boolean; created_at: string }[] = [];

  if (supabase) {
    const [{ data: authData }, noticeData] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("notices")
        .select("id, title, body, active, created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);
    user = authData.user;
    notices = (noticeData.data || []).filter((n) => n.active);
    if (user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = (p as Profile) || null;
    }
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%234F46E5'/%3E%3Ccircle cx='32' cy='32' r='13' fill='none' stroke='white' stroke-width='5'/%3E%3Ccircle cx='32' cy='32' r='4.5' fill='white'/%3E%3C/svg%3E"
        />
      </head>
      <body>
        <NoticeBanner notices={notices} />
        <nav className="top">
          <div className="nav-inner">
            <Link className="brand" href="/">
              <BrandMark /> FOCAL
            </Link>
            <div className="nav-links">
              <NavLinks
                items={[
                  ...NAV,
                  ...(profile?.role === "admin"
                    ? [{ href: "/admin", label: "Admin", icon: "user", active: "admin" }]
                    : []),
                  ...(profile?.role === "teacher"
                    ? [{ href: "/teacher", label: "Teacher", icon: "user", active: "teacher" }]
                    : []),
                ]}
              />
            </div>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Link href={profile?.role === "admin" ? "/admin" : profile?.role === "teacher" ? "/teacher" : "/dashboard"} className="nav-user">
                  <span className="ini">
                    {user.user_metadata?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.user_metadata.avatar_url} alt="" />
                    ) : (
                      <Icon name="user" size={15} />
                    )}
                  </span>
                  <span className="nm">{profile?.full_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || "Account"}</span>
                </Link>
                <LogoutButton className="icon-btn" style={{ width: 34, height: 34 }} />
              </div>
            ) : (
              <Link href="/login" className="nav-cta">
                Log in with Google
              </Link>
            )}
          </div>
        </nav>

        <main>{children}</main>

        <footer>
          <div className="foot-inner">
            <div className="foot-brand">
              <Link className="brand" href="/">
                <BrandMark size={26} /> FOCAL
              </Link>
              <p>Tuition science classes for grades 6–11, English medium, Sri Lanka.</p>
            </div>
            <div className="foot-cols">
              <div className="col">
                <h4>Explore</h4>
                <Link href="/dashboard">Results</Link>
                <Link href="/quiz">Quizzes</Link>
                <Link href="/board">Leaderboard</Link>
                <Link href="/login">Register / Login</Link>
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
                <Link href="/admin">Admin panel</Link>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            FOCAL <b>·</b> Made with care for students in Sri Lanka
          </div>
        </footer>

        <BottomNav
          items={[
            ...NAV,
            ...(profile?.role === "admin"
              ? [{ href: "/admin", label: "Admin", icon: "user", active: "admin" }]
              : []),
            ...(profile?.role === "teacher"
              ? [{ href: "/teacher", label: "Teacher", icon: "user", active: "teacher" }]
              : []),
            ...(!user ? [{ href: "/login", label: "Login", icon: "user", active: "login" }] : []),
          ]}
        />

        <div id="toast" />
      </body>
    </html>
  );
}
