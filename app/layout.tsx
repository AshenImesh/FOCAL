import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/toast";
import { NoticeBanner } from "./components/notice-banner";
import { SiteNav, type NavUser } from "./components/site-nav";
import { Footer } from "./components/footer";
import { publicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-d",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-b",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FOCAL — Science Classes · Grades 6–11",
  description:
    "FOCAL — tuition science classes for grades 6–11 (English medium). Check results, take quizzes, climb the leaderboard.",
};

async function getNotices() {
  try {
    const { data } = await publicClient()
      .from("notices")
      .select("message")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<{ message: string }[]>();
    return (data ?? []).map((n) => n.message);
  } catch {
    return [];
  }
}

async function getUser(): Promise<NavUser> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      name: (user.user_metadata?.full_name as string) || null,
      email: user.email || "",
    };
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notices, user] = await Promise.all([getNotices(), getUser()]);

  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body>
        <ToastProvider>
          <NoticeBanner notices={notices} />
          <SiteNav user={user} />
          <main>{children}</main>
          <Footer user={user} />
        </ToastProvider>
      </body>
    </html>
  );
}
