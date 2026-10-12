"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Mail,
  Lock,
  User,
  School,
  Loader2,
  CheckCircle2,
  Languages,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import SchoolAutocomplete from "@/components/SchoolAutocomplete";

type Medium = "si" | "en";

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

  const passwordOk = password.length >= 6;
  const matchOk = password.length > 0 && password === confirm;
  const formOk =
    fullName.trim().length >= 2 &&
    /\S+@\S+\.\S+$/.test(email) &&
    school.trim().length >= 2 &&
    passwordOk &&
    matchOk;

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
          medium,                       // ← captured by handle_new_user
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
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.replace("/student/dashboard");
      router.refresh();
    }
  }

  if (done) {
    return <SuccessCard email={email} onContinue={() => router.push("/auth/login")} />;
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
          <h1 className="text-2xl font-bold text-slate-900">ලියාපදිංචි වන්න</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create your account · නොමිලේ, තත්පර 30ක් ඇතුළත.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field icon={<User className="h-4 w-4" />} label="සම්පූර්ණ නම" hint="Full name">
              <input
                type="text"
                required
                autoComplete="name"
                className="input pl-9"
                placeholder="උදා: කමල් පෙරේරා"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>

            <Field icon={<Mail className="h-4 w-4" />} label="විද්‍යුත් තැපෑල" hint="Email">
              <input
                type="email"
                required
                autoComplete="email"
                className="input pl-9"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field icon={<School className="h-4 w-4" />} label="පාසල" hint="School">
              <SchoolAutocomplete value={school} onChange={setSchool} required />
            </Field>

            {/* ---------- Medium selector ---------- */}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <Languages className="h-3.5 w-3.5 text-slate-400" />
                  ඉගෙනුම් මාධ්‍යය
                </span>
                <span className="text-[11px] text-slate-400">Medium</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MediumOption
                  active={medium === "si"}
                  onClick={() => setMedium("si")}
                  title="සිංහල"
                  subtitle="Sinhala Medium"
                  emoji="🇱🇰"
                />
                <MediumOption
                  active={medium === "en"}
                  onClick={() => setMedium("en")}
                  title="English"
                  subtitle="English Medium"
                  emoji="🌐"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {medium === "si"
                  ? "ඔබට සිංහල මාධ්‍යයේ ප්‍රශ්නාවලි පමණක් පෙන්වනු ලැබේ."
                  : "You will only see English-medium quizzes."}
              </p>
            </div>

            <Field icon={<Lock className="h-4 w-4" />} label="මුරපදය" hint="Password (min 6)">
              <input
                type="password"
                required
                autoComplete="new-password"
                className="input pl-9"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <Field
              icon={<Lock className="h-4 w-4" />}
              label="මුරපදය තහවුරු කරන්න"
              hint="Confirm password"
            >
              <input
                type="password"
                required
                autoComplete="new-password"
                className="input pl-9"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>

            {password.length > 0 && !passwordOk && (
              <p className="text-xs text-amber-600">මුරපදය අවම අක්ෂර 6ක් විය යුතුය.</p>
            )}
            {confirm.length > 0 && !matchOk && (
              <p className="text-xs text-amber-600">මුරපද දෙක නොගැලපේ.</p>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={!formOk || loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "නිර්මාණය කරමින්..." : "ගිණුම නිර්මාණය කරන්න"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            දැනටමත් ගිණුමක් තිබේද?{" "}
            <Link href="/auth/login" className="font-semibold text-brand-600 hover:underline">
              ඇතුල් වන්න
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

/* ---------- helpers ---------- */

function Field({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <span className="text-[11px] text-slate-400">{hint}</span>
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
      </div>
    </label>
  );
}

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
      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition ${
        active
          ? "border-brand-500 bg-brand-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span
        className={`text-sm font-bold ${
          active ? "text-brand-700" : "text-slate-700"
        }`}
      >
        {title}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-slate-400">
        {subtitle}
      </span>
    </button>
  );
}

function SuccessCard({ email, onContinue }: { email: string; onContinue: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-linear-to-b from-brand-50 via-white to-white px-5">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">ලියාපදිංචිය සාර්ථකයි!</h1>
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium text-slate-800">{email}</span> වෙත තහවුරු කිරීමේ විද්‍යුත් තැපෑලක් යවා ඇත.
          එය තහවුරු කර, පසුව ඇතුල් වන්න.
        </p>
        <button onClick={onContinue} className="btn-primary mt-6 w-full py-3">
          ඇතුල් වීමේ පිටුවට යන්න
        </button>
      </div>
    </main>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "මෙම විද්‍යුත් තැපෑල දැනටමත් ලියාපදිංචි වී ඇත. කරුණාකර ඇතුල් වන්න.";
  if (m.includes("password")) return "මුරපදය පිළිගත නොහැක. අවම අක්ෂර 6ක් භාවිතා කරන්න.";
  if (m.includes("email")) return "වලංගු විද්‍යුත් තැපැල් ලිපිනයක් ඇතුල් කරන්න.";
  if (m.includes("rate limit")) return "ඉතින් ඉක්මනින් උත්සාහ කළා. මඳක් රැඳී නැවත උත්සාහ කරන්න.";
  return "ලියාපදිංචිය අසාර්ථකයි. නැවත උත්සාහ කරන්න.";
}