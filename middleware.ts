import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (items: Array<{ name: string; value: string; options?: Record<string, unknown> }>) =>
          items.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options as any)
          ),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  const guarded = path.startsWith("/student") || path.startsWith("/admin");
  const guestOnly = path.startsWith("/auth");

  if (guarded && !user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
  if (guestOnly && user) {
    return NextResponse.redirect(new URL("/student/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};