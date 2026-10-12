"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FlaskConical,
  LayoutDashboard,
  Library,
  CalendarClock,
  BarChart3,
  LogOut,
  Loader2,
  Menu,
  X,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { clearAdminSession } from "@/lib/admin-session";
import AdminGuard from "./AdminGuard";

/* ---------------------------------------------------------------- */
/*  Nav definitions                                                 */
/* ---------------------------------------------------------------- */

const BASE_NAV = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/questions",
    label: "Question Bank",
    icon: Library,
  },
  {
    href: "/admin/quizzes",
    label: "Quizzes",
    icon: CalendarClock,
  },
  {
    href: "/admin/performance",
    label: "Performance",
    icon: BarChart3,
  },
] as const;

const SUPER_NAV = {
  href: "/admin/super",
  label: "User Management",
  icon: Crown,
} as const;

/* ---------------------------------------------------------------- */
/*  Layout                                                          */
/* ---------------------------------------------------------------- */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* null = still loading · false = regular admin · true = super admin */
  const [isSuper, setIsSuper] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setIsSuper(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", user.id)
        .single();

      if (!cancelled) setIsSuper(!!profile?.is_super_admin);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const NAV = useMemo(
    () => (isSuper ? [...BASE_NAV, SUPER_NAV] : [...BASE_NAV]),
    [isSuper]
  );

  async function signOut() {
    setSigningOut(true);
    clearAdminSession();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-slate-50">
        {/* ============ Desktop sidebar ============ */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          {/* Brand */}
          <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-500/30">
              <FlaskConical className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold tracking-tight text-slate-900">
                O/L Science Quiz
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Admin
                </span>
                {isSuper === true && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                    <Crown className="h-2.5 w-2.5" /> Super
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              const isSuperItem = item.href === "/admin/super";

              const activeClasses = isSuperItem
                ? "bg-amber-50 text-amber-700"
                : "bg-sky-50 text-sky-700";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? activeClasses
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${
                      active
                        ? isSuperItem
                          ? "bg-amber-100 text-amber-600"
                          : "bg-sky-100 text-sky-600"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer sign-out */}
          <div className="border-t border-slate-100 p-3">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-red-100">
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </span>
              Sign out
            </button>
          </div>
        </aside>

        {/* ============ Main column ============ */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md lg:hidden">
            <Link
              href="/admin/dashboard"
              className="flex min-w-0 items-center gap-2.5"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-500/30">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-bold tracking-tight text-slate-900">
                  Admin
                </span>
                {isSuper === true && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">
                    <Crown className="h-2.5 w-2.5" /> Super
                  </span>
                )}
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </header>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="border-b border-slate-200 bg-white lg:hidden">
              <nav className="space-y-1 p-3">
                {NAV.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  const isSuperItem = item.href === "/admin/super";

                  const activeClasses = isSuperItem
                    ? "bg-amber-50 text-amber-700"
                    : "bg-sky-50 text-sky-700";

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                        active
                          ? activeClasses
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                          active
                            ? isSuperItem
                              ? "bg-amber-100 text-amber-600"
                              : "bg-sky-100 text-sky-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}

                <div className="my-2 h-px bg-slate-100" />

                <button
                  onClick={signOut}
                  disabled={signingOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500">
                    {signingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </span>
                  Sign out
                </button>
              </nav>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}