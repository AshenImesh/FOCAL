"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ic } from "./icons";
import { useToast } from "./toast";
import { signOutStudent } from "@/lib/actions";

export type NavUser = {
  name: string | null;
  email: string;
} | null;

const NAV = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/dashboard", label: "Results", icon: "bars" },
  { href: "/quiz", label: "Quiz", icon: "bolt" },
  { href: "/board", label: "Board", icon: "trophy" },
] as const;

function Logo() {
  return (
    <span className="brand">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="url(#lg)" />
        <circle cx="16" cy="16" r="6.6" stroke="white" strokeWidth="2.6" />
        <circle cx="16" cy="16" r="2.2" fill="white" />
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#4F46E5" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
      FOCAL
    </span>
  );
}

function initialsOf(name: string | null, email: string) {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }
  return (email[0] || "?").toUpperCase();
}

function LogoutButton() {
  const { toast } = useToast();
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        await signOutStudent();
        toast("Signed out");
        window.location.href = "/";
      }}
    >
      <Ic.logout size={14} /> Sign out
    </button>
  );
}

export function SiteNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <nav className="top">
        <div className="nav-inner">
          <Link href="/">
            <Logo />
          </Link>
          <div className="nav-links">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={isActive(n.href) ? "active" : ""}
              >
                {n.label}
              </Link>
            ))}
          </div>
          {user ? (
            <div className="nav-user">
              <Link
                href="/dashboard"
                className="nav-cta"
                style={{ padding: "6px 12px" }}
              >
                {initialsOf(user.name, user.email)}
              </Link>
              <LogoutButton />
            </div>
          ) : (
            <Link className="nav-cta" href="/login">
              Login
            </Link>
          )}
        </div>
      </nav>

      <nav className="bottom">
        <div className="bottom-inner">
          {NAV.map((n) => {
            const Icon = Ic[n.icon];
            return (
              <Link
                key={n.href}
                href={n.href}
                className={isActive(n.href) ? "active" : ""}
              >
                <Icon size={20} />
                {n.label}
              </Link>
            );
          })}
          <Link
            href={user ? "/dashboard" : "/login"}
            className={isActive("/dashboard") ? "active" : ""}
          >
            <Ic.user size={20} />
            {user ? "Me" : "Login"}
          </Link>
        </div>
      </nav>
    </>
  );
}
