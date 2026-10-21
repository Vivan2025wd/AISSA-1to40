"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null);
  const mobileOpen = mobileOpenPath === pathname;
  const [userName, setUserName] = useState<string | null>(null);

  /* Fetch user name once — reads from auth cache, no DB cost */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name;
      if (typeof name === "string" && name.trim()) {
        setUserName(name.trim());
      }
    });
  }, []);

  /* Lock body scroll while drawer open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileOpen]);

  async function signOut() {
    setSigningOut(true);
    clearAdminSession();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;

  const firstName = userName?.split(" ")[0] ?? null;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      {/* ============ Header ============ */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Logo */}
          <Link
            href="/student/dashboard"
            className="group flex shrink-0 items-center gap-2.5 transition active:scale-[0.98]"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/30 ring-1 ring-sky-500/20 transition group-hover:shadow-md group-hover:shadow-sky-500/40">
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
                  className={`group relative inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-sky-50 text-sky-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-sky-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right cluster: user pill + sign out (desktop) */}
          <div className="hidden items-center gap-2 sm:flex">
            {initials && (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-linear-to-br from-sky-500 to-sky-600 text-[10px] font-bold text-white shadow-sm">
                  {initials}
                </div>
                {firstName && (
                  <span className="max-w-25 truncate text-xs font-medium text-slate-700">
                    {firstName}
                  </span>
                )}
              </div>
            )}

            <button
              onClick={signOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700 active:scale-[0.98] disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Sign out
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpenPath(pathname)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 active:scale-95 sm:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ============ Main ============ */}
      <main className="flex-1">{children}</main>

      {/* ============ Footer ============ */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-linear-to-br from-sky-500 to-sky-600 text-white">
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

      {/* ============ Mobile drawer OVERLAY ============ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpenPath(null)}
            aria-hidden="true"
          />

          {/* Slide-in panel */}
          <div
            className="absolute right-0 top-0 flex h-full w-70 flex-col bg-white shadow-2xl ring-1 ring-slate-900/5"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            {/* Drawer header */}
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-sky-500 to-sky-600 text-white shadow-sm">
                  <FlaskConical className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold tracking-tight text-slate-900">
                    Menu
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Student
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileOpenPath(null)}
                className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 active:scale-95"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User pill */}
            {userName && (
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-sky-500 to-sky-600 text-xs font-bold text-white shadow-sm">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {userName}
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      Signed in
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nav */}
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpenPath(null)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3.5 text-sm font-medium transition active:scale-[0.98] ${
                      active
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
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
            </nav>

            {/* Sign out */}
            <div
              className="border-t border-slate-100 p-3"
              style={{
                paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
              }}
            >
              <button
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3.5 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500">
                  {signingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                </span>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}