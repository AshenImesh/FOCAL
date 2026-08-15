import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const STUDENT_ROUTES = ["/dashboard", "/quiz", "/board", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsStudent = STUDENT_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  const { response, user } = await updateSession(request);

  if (needsStudent && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon, public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js)$).*)",
  ],
};
