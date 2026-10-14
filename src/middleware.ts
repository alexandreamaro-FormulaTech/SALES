import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!configured) {
    const session = request.cookies.get("f360_session")?.value;
    if (!session && pathname !== "/login" && pathname !== "/api/logout") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      if (pathname !== "/") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (session && pathname === "/login") return NextResponse.redirect(new URL("/crm/dashboard", request.url));
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const isPublic = pathname === "/login" || pathname === "/api/logout";
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") return NextResponse.redirect(new URL("/crm/dashboard", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.png|.*\\.png$).*)"],
};
