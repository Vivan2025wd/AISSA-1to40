"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Mail,
  Lock,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { setAdminSession, clearAdminSession } from "@/lib/admin-session";

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * false → step 1: email + password
   * true  → step 2: same card, access code revealed inline.
   *         Email/password stay visible but locked.
   */
  const [needsAdminCode, setNeedsAdminCode] = useState(false);

  /* ------------------------------------------------------------- */
  /*  Single submit handler — same button, two stages              */
  /* ------------------------------------------------------------- */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    /* ---------- Step 2: verify admin access code ---------- */
    if (needsAdminCode) {
      if (!adminCode.trim()) return;
      setLoading(true);

      const { data, error: rpcErr } = await supabase.rpc("verify_admin_code", {
        p_code: adminCode,
      });

      setLoading(false);

      if (rpcErr || !data) {
        setError("That admin access code is incorrect.");
        return;
      }

      setAdminSession();
      router.replace("/admin/dashboard");
      router.refresh();
      return;
    }

    /* ---------- Step 1: email + password ---------- */
    if (!email || !password) return;
    setLoading(true);

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInErr) {
      setLoading(false);
      setError(translateError(signInErr.message));
      return;
    }

    // Auth succeeded — figure out who this is
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user!.id)
      .single();

    setLoading(false);

    if (profile?.is_admin) {
      // Reveal access-code field inline — no navigation, no theme change
      clearAdminSession();
      setNeedsAdminCode(true);
      return;
    }

    // Regular student
    router.replace("/student/dashboard");
    router.refresh();
  }

  /* ------------------------------------------------------------- */
  /*  Back to credentials                                          */
  /* ------------------------------------------------------------- */
  async function backToCredentials() {
    setError(null);
    setAdminCode("");
    setPassword("");
    setNeedsAdminCode(false);
    clearAdminSession();
    await supabase.auth.signOut();
  }

  const inputBase =
    "w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <main className="grid min-h-screen place-items-center bg-linear-to-b from-sky-50 via-white to-slate-50 px-4 py-10 sm:px-5">
      <div className="w-full max-w-md">
        {/* ---------- Logo ---------- */}
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2.5"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-500/30">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight text-slate-900">
              O/L Science Quiz
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Sri Lanka
            </div>
          </div>
        </Link>

        {/* ---------- Card ---------- */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {/* ============ Header ============ */}
          {needsAdminCode ? (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-500 text-white shadow-sm shadow-sky-500/30">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 text-xs">
                  <div className="font-semibold text-sky-900">
                    Admin account detected
                  </div>
                  <div className="truncate text-sky-700">{email}</div>
                </div>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Access code
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Enter your admin access code to continue.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Sign in to continue to your quizzes.
              </p>
            </>
          )}

          {/* ============ Form ============ */}
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {/* Email */}
            <label className="block">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[13px] font-semibold text-slate-800">
                  Email
                </span>
              </div>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className={inputBase}
                  placeholder="you@example.com"
                  value={email}
                  disabled={needsAdminCode}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>

            {/* Password */}
            <label className="block">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[13px] font-semibold text-slate-800">
                  Password
                </span>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className={inputBase}
                  placeholder="••••••••"
                  value={password}
                  disabled={needsAdminCode}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </label>

            {/* Admin access code (revealed conditionally) */}
            {needsAdminCode && (
              <label className="block animate-in">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold text-slate-800">
                    Access code
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Required
                  </span>
                </div>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" />
                  <input
                    type="password"
                    autoFocus
                    autoComplete="off"
                    className={`${inputBase} border-sky-300 focus:border-sky-500`}
                    placeholder="Enter code"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                  />
                </div>
              </label>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={
                loading || (needsAdminCode ? !adminCode : !email || !password)
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? needsAdminCode
                  ? "Verifying…"
                  : "Signing in…"
                : needsAdminCode
                  ? "Continue to admin panel"
                  : "Sign in"}
            </button>

            {/* Switch account (admin step only) */}
            {needsAdminCode && (
              <button
                type="button"
                onClick={backToCredentials}
                disabled={loading}
                className="flex w-full items-center justify-center gap-1.5 pt-1 text-xs font-medium text-slate-500 transition hover:text-slate-800 disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Use a different account
              </button>
            )}
          </form>

          {/* ============ Register link ============ */}
          {!needsAdminCode && (
            <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
              Don't have an account?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-sky-600 transition hover:text-sky-700 hover:underline"
              >
                Create one
              </Link>
            </div>
          )}
        </div>

        {/* ============ Back to home ============ */}
        <div className="mt-5 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Error translation                                                 */
/* ------------------------------------------------------------------ */

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "Incorrect email or password.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email first. Check your inbox (and spam).";
  if (m.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";
  return "Sign in failed. Please try again.";
}