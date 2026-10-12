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
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { clearAdminSession } from "@/lib/admin-session";
import AdminGuard from "./AdminGuard";

/* ---------------------------------------------------------------- */
/*  Nav definitions                                                 */
/* ---------------------------------------------------------------- */

const BASE_NAV = [
  { href: "/admin/dashboard",   label: "සාරාංශය",      en: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/questions",   label: "ප්‍රශ්න බැංකුව", en: "Question Bank", icon: Library },
  { href: "/admin/quizzes",     label: "ප්‍රශ්නාවලි",    en: "Quizzes",       icon: CalendarClock },
  { href: "/admin/performance", label: "ප්‍රතිඵල",       en: "Performance",   icon: BarChart3 },
] as const;

const SUPER_NAV = {
  href: "/admin/super",
  label: "පරිපාලකයන්",
  en: "Super Admin",
  icon: Crown,
} as const;

/* ---------------------------------------------------------------- */
/*  Layout                                                          */
/* ---------------------------------------------------------------- */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Role state: null = still loading, false = regular admin, true = super admin
  const [isSuper, setIsSuper] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      <div className="flex min-h-screen bg-slate-100">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">
              <FlaskConical className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">
                O/L Science Quiz
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  Admin
                </span>
                {isSuper === true && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                    <Crown className="h-2.5 w-2.5" /> Super
                  </span>
                )}
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              const isSuperItem = item.href === "/admin/super";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? isSuperItem
                        ? "bg-amber-50 text-amber-700"
                        : "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{item.label}</div>
                    <div className="truncate text-[10px] uppercase tracking-wide text-slate-400">
                      {item.en}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-3">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              පිටවීම
            </button>
          </div>
        </aside>

        {/* Mobile / main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900">Admin</span>
                {isSuper === true && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                    <Crown className="h-2.5 w-2.5" /> Super
                  </span>
                )}
              </div>
            </Link>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </header>

          {mobileOpen && (
            <div className="border-b border-slate-200 bg-white lg:hidden">
              <nav className="space-y-1 p-3">
                {NAV.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  const isSuperItem = item.href === "/admin/super";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        active
                          ? isSuperItem
                            ? "bg-amber-50 text-amber-700"
                            : "bg-brand-50 text-brand-700"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="min-w-0 flex-1">
                        <div>{item.label}</div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">
                          {item.en}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                <button
                  onClick={signOut}
                  disabled={signingOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  {signingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  පිටවීම
                </button>
              </nav>
            </div>
          )}

          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}