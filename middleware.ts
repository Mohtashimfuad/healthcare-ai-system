import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types";
import { roleHome } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/patient", "/doctor"];
const AUTH_PAGES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    // Fetch role from profiles table (source of truth)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.role ?? user.user_metadata?.role ?? "patient";
    const home = roleHome(userRole);

    if (pathname.startsWith("/patient") && userRole === "doctor") {
      const url = request.nextUrl.clone();
      url.pathname = "/doctor";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/doctor") && userRole === "patient") {
      const url = request.nextUrl.clone();
      url.pathname = "/patient";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname === "/dashboard") {
      const url = request.nextUrl.clone();
      url.pathname = home;
      url.search = "";
      return NextResponse.redirect(url);
    }

    const isAuthPage = AUTH_PAGES.includes(pathname);
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      url.searchParams.delete("redirectTo");
      url.searchParams.delete("role");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
