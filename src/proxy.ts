import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/markets",
  "/signals",
  "/ai-analysis",
  "/strategy-lab",
  "/performance",
  "/watchlist",
  "/alerts",
  "/settings",
];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(name, value);
            },
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options,
              );
            },
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log(
    "[SignalPilot Proxy]",
    request.nextUrl.pathname,
    "user:",
    user?.email ?? "SIGNED_OUT",
  );

  const { pathname } = request.nextUrl;

  if (isProtectedRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = "/auth/login";
    loginUrl.search = "";

    loginUrl.searchParams.set(
      "redirectTo",
      pathname,
    );

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/markets/:path*",
    "/signals/:path*",
    "/ai-analysis/:path*",
    "/strategy-lab/:path*",
    "/performance/:path*",
    "/watchlist/:path*",
    "/alerts/:path*",
    "/settings/:path*",
  ],
};