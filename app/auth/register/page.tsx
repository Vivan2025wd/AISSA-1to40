"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Mail,
  Lock,
  User,
  School as SchoolIcon,
  Loader2,
  Languages,
  ArrowLeft,
  AlertTriangle,
  MailCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import SchoolAutocomplete from "@/components/SchoolAutocomplete";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type Medium = "si" | "en";

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [medium, setMedium] = useState<Medium>("si");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /* ---------- Validation ---------- */

  const passwordOk = password.length >= 6;
  const matchOk = password.length > 0 && password === confirm;
  const formOk =
    fullName.trim().length >= 2 &&
    /\S+@\S+\.\S+$/.test(email) &&
    school.trim().length >= 2 &&
    passwordOk &&
    matchOk;

  /* ---------- Submit ---------- */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!formOk) return;

    setLoading(true);
    const { error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          school: school.trim(),
          medium, // captured by handle_new_user()
        },
        emailRedirectTo: `${window.location.origin}/student/dashboard`,
      },
    });
    setLoading(false);

    if (signUpErr) {
      setError(translateError(signUpErr.message));
      return;
    }

    setDone(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      // Email confirmation disabled → straight in
      router.replace("/student/dashboard");
      router.refresh();
    }
  }

  /* ---------- Success screen ---------- */

  if (done) {
    return (
      <SuccessCard
        email={email}
        onContinue={() => router.push("/auth/login")}
      />
    );
  }

  const inputBase =
    "w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <main className="grid min-h-dvh place-items-center bg-linear-to-b from-sky-50 via-white to-slate-50 px-4 py-10 sm:px-5">
      <div className="w-full max-w-md">
        {/* ---------- Logo ---------- */}
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
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
          {/* Header */}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Free forever — takes under 30 seconds.
          </p>

          {/* Form */}
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {/* Full name */}
            <Field
              icon={<User className="h-4 w-4" />}
              label="Full name"
              required
            >
              <input
                type="text"
                required
                autoComplete="name"
                className={inputBase}
                placeholder="e.g. Kamal Perera"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>

            {/* Email */}
            <Field icon={<Mail className="h-4 w-4" />} label="Email" required>
              <input
                type="email"
                required
                autoComplete="email"
                className={inputBase}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            {/* School */}
            <Field
              icon={<SchoolIcon className="h-4 w-4" />}
              label="School"
              required
            >
              <SchoolAutocomplete value={school} onChange={setSchool} required />
            </Field>

            {/* ---------- Medium selector ---------- */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                  <Languages className="h-3.5 w-3.5 text-slate-400" />
                  Medium
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Required
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MediumOption
                  active={medium === "si"}
                  onClick={() => setMedium("si")}
                  title="Sinhala"
                  subtitle="සිංහල මාධ්‍යය"
                  emoji="🇱🇰"
                />
                <MediumOption
                  active={medium === "en"}
                  onClick={() => setMedium("en")}
                  title="English"
                  subtitle="English medium"
                  emoji="🌐"
                />
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {medium === "si"
                  ? "You will only see Sinhala-medium quizzes."
                  : "You will only see English-medium quizzes."}
              </p>
            </div>

            {/* Password */}
            <Field
              icon={<Lock className="h-4 w-4" />}
              label="Password"
              required
              hint="Min 6 characters"
            >
              <input
                type="password"
                required
                autoComplete="new-password"
                className={inputBase}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {/* Confirm password */}
            <Field
              icon={<Lock className="h-4 w-4" />}
              label="Confirm password"
              required
            >
              <input
                type="password"
                required
                autoComplete="new-password"
                className={inputBase}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>

            {/* Inline validation hints */}
            {password.length > 0 && !passwordOk && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Password must be at least 6 characters.
              </p>
            )}
            {confirm.length > 0 && !matchOk && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Passwords don&apos;t match.
              </p>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!formOk || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none sm:py-3"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-sky-600 transition hover:text-sky-700 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-5 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
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
/*  Field wrapper                                                     */
/* ------------------------------------------------------------------ */

function Field({
  icon,
  label,
  hint,
  required,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-slate-800">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        {hint && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
      </div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Medium option                                                     */
/* ------------------------------------------------------------------ */

function MediumOption({
  active,
  onClick,
  title,
  subtitle,
  emoji,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  emoji: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition active:scale-[0.98] ${
        active
          ? "border-sky-500 bg-sky-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span
        className={`text-sm font-bold ${
          active ? "text-sky-700" : "text-slate-700"
        }`}
      >
        {title}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {subtitle}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Success card                                                      */
/* ------------------------------------------------------------------ */

function SuccessCard({
  email,
  onContinue,
}: {
  email: string;
  onContinue: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-linear-to-b from-sky-50 via-white to-slate-50 px-4 sm:px-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-600">
          <MailCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
          Check your inbox
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          We&apos;ve sent a confirmation link to{" "}
          <span className="font-semibold text-slate-800">{email}</span>.
          Click it to activate your account, then sign in.
        </p>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-left text-xs leading-relaxed text-amber-800">
          <strong className="font-semibold">Didn&apos;t get it?</strong> Check your
          spam folder.
        </div>

        <button
          onClick={onContinue}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] sm:py-3"
        >
          Go to sign-in
        </button>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Error translation                                                 */
/* ------------------------------------------------------------------ */

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "This email is already registered. Try signing in instead.";
  if (m.includes("password"))
    return "Password not accepted. Use at least 6 characters.";
  if (m.includes("email"))
    return "Please enter a valid email address.";
  if (m.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";
  return "Registration failed. Please try again.";
}