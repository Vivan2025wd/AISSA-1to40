"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { hasAdminSession, clearAdminSession } from "@/lib/admin-session";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type State = "checking" | "denied" | "ok";
type DenialReason = "session" | "role" | "";

/* ------------------------------------------------------------------ */
/*  Guard                                                             */
/* ------------------------------------------------------------------ */

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [reason, setReason] = useState<DenialReason>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      /* 1. Tab-scoped admin session token */
      if (!hasAdminSession()) {
        if (!cancelled) {
          setReason("session");
          setState("denied");
        }
        return;
      }

      /* 2. Supabase auth session */
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) router.replace("/auth/login");
        return;
      }

      /* 3. DB role */
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (!profile?.is_admin) {
        clearAdminSession();
        setReason("role");
        setState("denied");
        return;
      }

      setState("ok");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  /* ---------- Checking ---------- */

  if (state === "checking") {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Pulsing spinner ring */}
          <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-sky-50">
            <span className="absolute inset-0 animate-ping rounded-2xl bg-sky-100 opacity-40" />
            <Loader2 className="relative h-7 w-7 animate-spin text-sky-500" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Verifying admin access
            </div>
            <div className="mt-1 text-xs text-slate-500">
              This will only take a moment…
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Denied ---------- */

  if (state === "denied") {
    const isSessionExpired = reason === "session";
    const Icon = isSessionExpired ? KeyRound : ShieldAlert;

    return (
      <div className="grid min-h-dvh place-items-center bg-linear-to-b from-sky-50 via-white to-slate-50 px-4 py-10">
        <div className="w-full max-w-md">
          {/* Main card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            {/* Icon */}
            <div
              className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${
                isSessionExpired
                  ? "bg-amber-100 text-amber-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              <Icon className="h-7 w-7" />
            </div>

            {/* Heading */}
            <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {isSessionExpired ? "Session expired" : "Access denied"}
            </h1>

            {/* Message */}
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {isSessionExpired
                ? "Your admin session has expired. Please sign in again and enter your access code."
                : "This account doesn't have admin privileges."}
            </p>

            {/* CTA — full-width, larger tap target on mobile */}
            <button
              onClick={() => router.replace("/auth/login")}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] sm:py-3"
            >
              <ArrowLeft className="h-4 w-4" />
              {isSessionExpired ? "Sign in again" : "Back to sign in"}
            </button>

            {/* Secondary hint */}
            <p className="mt-5 text-[11px] leading-relaxed text-slate-400">
              {isSessionExpired
                ? "Tip: admin sessions end when the browser tab closes."
                : "If you believe this is a mistake, contact a super admin."}
            </p>
          </div>

          {/* Brand mark */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>O/L Science Quiz · Admin</span>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- OK ---------- */

  return <>{children}</>;
}