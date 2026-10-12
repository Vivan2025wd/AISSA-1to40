"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  FlaskConical,
  LayoutDashboard,
  Trophy,
  LogOut,
  Loader2,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { clearAdminSession } from "@/lib/admin-session";

/* ------------------------------------------------------------------ */
/*  Nav                                                               */
/* ------------------------------------------------------------------ */

const NAV = [
  {
    href: "/student/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/student/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Layout                                                            */
/* ------------------------------------------------------------------ */

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    setSigningOut(true);
    clearAdminSession();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ============ Header ============ */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Logo */}
          <Link
            href="/student/dashboard"
            className="flex shrink-0 items-center gap-2.5"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-500/30">
              <FlaskConical className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight text-slate-900">
                O/L Science Quiz
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Sri Lanka
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-sky-50 text-sky-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            <div className="ml-2 h-6 w-px bg-slate-200" />

            <button
              onClick={signOut}
              disabled={signingOut}
              className="ml-1 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Sign out
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 sm:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* ============ Mobile drawer ============ */}
        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white sm:hidden">
            <nav className="mx-auto max-w-6xl space-y-1 px-4 py-3">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                        active
                          ? "bg-sky-100 text-sky-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}

              <div className="my-2 h-px bg-slate-100" />

              <button
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
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
      </header>

      {/* ============ Main ============ */}
      <main className="flex-1">{children}</main>

      {/* ============ Footer ============ */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-sky-500 text-white">
              <FlaskConical className="h-3 w-3" />
            </div>
            <span>O/L Science Quiz · Built for Sri Lankan students</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400">
            <span>Island-wide</span>
            <span className="text-slate-300">·</span>
            <span>🇱🇰 Made in Sri Lanka</span>
          </div>
        </div>
      </footer>
    </div>
  );
}