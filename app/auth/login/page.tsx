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
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { setAdminSession, clearAdminSession } from "@/lib/admin-session";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * false → step 1: email + password
   * true  → step 2: same card, access code field revealed below.
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
        setError("පරිපාලක ප්‍රවේශ කේතය වැරදිය.");
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
    const { data: { user } } = await supabase.auth.getUser();
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
  /*  Back to credentials (sign out the just-authed admin)         */
  /* ------------------------------------------------------------- */
  async function backToCredentials() {
    setError(null);
    setAdminCode("");
    setPassword("");
    setNeedsAdminCode(false);
    clearAdminSession();
    await supabase.auth.signOut();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-linear-to-b from-brand-50 via-white to-white px-5 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">
            <FlaskConical className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-slate-900">O/L Science Quiz</span>
        </Link>

        <div className="card p-6 sm:p-8">
          {/* ---------- Heading ---------- */}
          {needsAdminCode ? (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
                <ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" />
                <div className="min-w-0 text-xs">
                  <div className="font-semibold text-brand-900">
                    පරිපාලක ගිණුමක් හඳුනාගන්නා ලදී
                  </div>
                  <div className="truncate text-brand-700">{email}</div>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-slate-900">ප්‍රවේශ කේතය</h1>
              <p className="mt-1 text-sm text-slate-600">
                ඉදිරියට යාමට Admin access code ඇතුල් කරන්න.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">ඇතුල් වන්න</h1>
              <p className="mt-1 text-sm text-slate-600">
                Sign in · ඔබේ ගිණුමට පිවිසෙන්න.
              </p>
            </>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {/* ---------- Email ---------- */}
            <label className="block">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-800">විද්‍යුත් තැපෑල</span>
                <span className="text-[11px] text-slate-400">Email</span>
              </div>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="input pl-9 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="you@example.com"
                  value={email}
                  disabled={needsAdminCode}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>

            {/* ---------- Password ---------- */}
            <label className="block">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-800">මුරපදය</span>
                <span className="text-[11px] text-slate-400">Password</span>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="input pl-9 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="••••••••"
                  value={password}
                  disabled={needsAdminCode}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </label>

            {/* ---------- Admin access code (revealed conditionally) ---------- */}
            {needsAdminCode && (
              <label className="block animate-in">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-800">ප්‍රවේශ කේතය</span>
                  <span className="text-[11px] text-slate-400">Admin code</span>
                </div>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    autoFocus
                    autoComplete="off"
                    className="input pl-9"
                    placeholder="Access code"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                  />
                </div>
              </label>
            )}

            {/* ---------- Error ---------- */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ---------- Same button, two labels ---------- */}
            <button
              type="submit"
              disabled={
                loading ||
                (needsAdminCode ? !adminCode : !email || !password)
              }
              className="btn-primary w-full py-3"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? needsAdminCode
                  ? "තහවුරු කරමින්..."
                  : "පිවිසෙමින්..."
                : needsAdminCode
                  ? "පරිපාලක පැනලයට යන්න"
                  : "ඇතුල් වන්න"}
            </button>

            {/* ---------- Switch account (admin step only) ---------- */}
            {needsAdminCode && (
              <button
                type="button"
                onClick={backToCredentials}
                disabled={loading}
                className="flex w-full items-center justify-center gap-1 pt-1 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                වෙනත් ගිණුමකින් ඇතුල් වන්න
              </button>
            )}
          </form>

          {/* ---------- Register link (hidden once admin detected) ---------- */}
          {!needsAdminCode && (
            <p className="mt-6 text-center text-sm text-slate-600">
              ගිණුමක් නැද්ද?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-brand-600 hover:underline"
              >
                ලියාපදිංචි වන්න
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------- */
/*  Error translation                                            */
/* ------------------------------------------------------------- */
function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "විද්‍යුත් තැපෑල හෝ මුරපදය වැරදිය.";
  if (m.includes("email not confirmed"))
    return "කරුණාකර ඔබේ විද්‍යුත් තැපෑල තහවුරු කරන්න. (Inbox / Spam බලන්න)";
  if (m.includes("rate limit"))
    return "ඉතා ඉක්මනින් උත්සාහ කළා. මඳක් රැඳී නැවත උත්සාහ කරන්න.";
  return "පිවිසුම අසාර්ථකයි. නැවත උත්සාහ කරන්න.";
}