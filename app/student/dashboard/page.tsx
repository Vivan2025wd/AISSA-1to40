"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Trophy,
  ClipboardList,
  Target,
  TrendingUp,
  Clock,
  Calendar,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatCountdown, getQuizWindow } from "@/lib/quiz-window";

interface DashboardData {
  profile: { id: string; full_name: string; email: string; school: string };
  stats: {
    total_exams: number;
    avg_pct: number;
    best_pct: number;
    island_rank: number | null;
  };
  past_results: {
    id: string;
    quiz_id: string;
    title: string;
    score: number;
    total: number;
    time_spent_seconds: number;
    submitted_at: string;
  }[];
  live_quizzes: {
    id: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    duration_minutes: number;
    question_count: number;
    attempted: boolean;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: res, error: rpcErr } = await supabase.rpc("get_dashboard_data");
      if (rpcErr) {
        setError(rpcErr.message);
        setLoading(false);
        return;
      }
      setData(res as DashboardData);
      setLoading(false);
    })();
  }, []);

  if (loading) return <CenterSpinner label="පූරණය වෙමින්..." />;
  if (error) return <CenterError message={error} />;
  if (!data) return null;

  const firstName = data.profile.full_name.split(" ")[0] || "සිසු";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          ආයුබෝවන්, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-600">{data.profile.school}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="විභාග"
          en="Exams taken"
          value={data.stats.total_exams.toString()}
          accent="blue"
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="සාමාන්‍ය"
          en="Average"
          value={`${data.stats.avg_pct}%`}
          accent="green"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="හොඳම"
          en="Best"
          value={`${data.stats.best_pct}%`}
          accent="amber"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="දිවයිනේ ස්ථානය"
          en="Island rank"
          value={data.stats.island_rank ? `#${data.stats.island_rank}` : "—"}
          accent="purple"
        />
      </div>

      {/* Quizzes */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">ප්‍රශ්නාවලි</h2>
          <span className="text-xs text-slate-500">
            {data.live_quizzes.length} available
          </span>
        </div>

        {data.live_quizzes.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-6 w-6" />}
            title="දැනට ප්‍රශ්නාවලි නොමැත"
            desc="පරිපාලකයා විසින් නව ප්‍රශ්නාවලියක් ප්‍රකාශයට පත් කළ විට මෙහි දිස්වනු ඇත."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.live_quizzes.map((q) => (
              <QuizCard key={q.id} quiz={q} />
            ))}
          </div>
        )}
      </section>

      {/* Past results */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">පසුගිය ප්‍රතිඵල</h2>
        </div>

        {data.past_results.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="තවම ප්‍රතිඵල නොමැත"
            desc="පළමු ප්‍රශ්නාවලියට සහභාගී වූ පසු ඔබේ ප්‍රතිඵල මෙහි දිස්වනු ඇත."
          />
        ) : (
          <div className="card overflow-hidden">
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">ප්‍රශ්නාවලිය</th>
                    <th className="px-4 py-3 font-medium">ලකුණු</th>
                    <th className="px-4 py-3 font-medium">%</th>
                    <th className="px-4 py-3 font-medium">වේලාව</th>
                    <th className="px-4 py-3 font-medium">දිනය</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.past_results.map((r) => {
                    const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="max-w-60 truncate px-4 py-3 font-medium text-slate-800">
                          {r.title}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {r.score} / {r.total}
                        </td>
                        <td className="px-4 py-3">
                          <PctBadge pct={pct} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {fmtDuration(r.time_spent_seconds)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {fmtDate(r.submitted_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/student/quiz/${r.quiz_id}`}
                            className="text-xs font-semibold text-brand-600 hover:underline"
                          >
                            සමාලෝචනය
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {data.past_results.map((r) => {
                const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                return (
                  <Link
                    key={r.id}
                    href={`/student/quiz/${r.quiz_id}`}
                    className="block px-4 py-3 active:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-slate-800">{r.title}</span>
                      <PctBadge pct={pct} />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span>
                        {r.score}/{r.total}
                      </span>
                      <span>·</span>
                      <span>{fmtDuration(r.time_spent_seconds)}</span>
                      <span>·</span>
                      <span>{fmtDate(r.submitted_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

function StatCard({
  icon,
  label,
  en,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  en: string;
  value: string;
  accent: "blue" | "green" | "amber" | "purple";
}) {
  const accents = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  } as const;

  return (
    <div className="card p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${accents[accent]}`}>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-700">{label}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{en}</div>
    </div>
  );
}

function QuizCard({
  quiz,
}: {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    duration_minutes: number;
    question_count: number;
    attempted: boolean;
  };
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const w = getQuizWindow(quiz.scheduled_at, quiz.duration_minutes);
  const attemptable = w.status === "active" && !quiz.attempted;

  return (
    <div className="card flex flex-col p-4 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 line-clamp-2">{quiz.title}</h3>
        {quiz.attempted ? (
          <span className="badge bg-green-50 text-green-700">
            <CheckCircle2 className="h-3 w-3" /> නිමයි
          </span>
        ) : w.status === "active" ? (
          <span className="badge bg-brand-50 text-brand-700">සක්‍රීය</span>
        ) : w.status === "upcoming" ? (
          <span className="badge bg-amber-50 text-amber-700">ඉදිරියේ</span>
        ) : (
          <span className="badge bg-slate-100 text-slate-600">අවසන්</span>
        )}
      </div>

      {quiz.description && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{quiz.description}</p>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <ClipboardList className="h-3.5 w-3.5" /> {quiz.question_count} ප්‍රශ්න
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {quiz.duration_minutes} මිනිත්තු
        </span>
      </div>

      <div className="mt-2 text-xs">
        {w.status === "upcoming" && (
          <span className="text-amber-700">
            ආරම්භය {formatCountdown(w.remainingSeconds)} කින්
          </span>
        )}
        {w.status === "active" && !quiz.attempted && (
          <span className="font-medium text-brand-700">
            අවසන් වන තෙක් {formatCountdown(w.remainingSeconds)}
          </span>
        )}
        {w.status === "expired" && !quiz.attempted && (
          <span className="text-slate-500">අවසන් විය</span>
        )}
      </div>

      <div className="mt-4">
        {attemptable ? (
          <Link href={`/student/quiz/${quiz.id}`} className="btn-primary w-full">
            <PlayCircle className="h-4 w-4" /> ආරම්භ කරන්න
          </Link>
        ) : quiz.attempted ? (
          <Link href={`/student/quiz/${quiz.id}`} className="btn-outline w-full">
            <ChevronRight className="h-4 w-4" /> සමාලෝචනය
          </Link>
        ) : (
          <button disabled className="btn-outline w-full">
            නොමැත
          </button>
        )}
      </div>
    </div>
  );
}

function PctBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 75
      ? "bg-green-50 text-green-700"
      : pct >= 50
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";
  return <span className={`badge ${tone}`}>{pct}%</span>;
}

function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function CenterSpinner({ label }: { label: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

function CenterError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        දත්ත පූරණය කිරීමේ දෝෂයක්: {message}
      </div>
    </div>
  );
}

/* ---------------- Utilities ---------------- */

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}