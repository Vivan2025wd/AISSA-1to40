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
  BookOpen,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatCountdown, getQuizWindow } from "@/lib/quiz-window";

/* ------------------------------------------------------------------ */
/*  Types (mirror the RPC response — unchanged)                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

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

  if (loading) return <CenterSpinner label="Loading dashboard…" />;
  if (error) return <CenterError message={error} />;
  if (!data) return null;

  const firstName = data.profile.full_name.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ============ Greeting ============ */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Hi, {firstName} 👋
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <BookOpen className="h-3.5 w-3.5" />
          {data.profile.school || "Sri Lanka"}
        </p>
      </header>

      {/* ============ Stats ============ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Exams taken"
          value={data.stats.total_exams.toString()}
          accent="sky"
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Average"
          value={`${data.stats.avg_pct}%`}
          accent="emerald"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Best score"
          value={`${data.stats.best_pct}%`}
          accent="amber"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Island rank"
          value={data.stats.island_rank ? `#${data.stats.island_rank}` : "—"}
          accent="violet"
        />
      </div>

      {/* ============ Quizzes ============ */}
      <section className="mt-8 sm:mt-10">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Quizzes</h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {data.live_quizzes.length}
            </span>
          </div>
        </div>

        {data.live_quizzes.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-6 w-6" />}
            title="No quizzes yet"
            desc="New quizzes will appear here as soon as the admin publishes them."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.live_quizzes.map((q) => (
              <QuizCard key={q.id} quiz={q} />
            ))}
          </div>
        )}
      </section>

      {/* ============ Past results ============ */}
      <section className="mt-8 sm:mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Past results</h2>
          {data.past_results.length > 0 && (
            <span className="text-xs text-slate-500">
              {data.past_results.length} record
              {data.past_results.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {data.past_results.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="No results yet"
            desc="Finish your first quiz and your results will show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Quiz</th>
                    <th className="px-5 py-3">Score</th>
                    <th className="px-5 py-3">%</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.past_results.map((r) => {
                    const pct =
                      r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                    return (
                      <tr key={r.id} className="transition hover:bg-slate-50/60">
                        <td className="max-w-60 truncate px-5 py-3.5 font-medium text-slate-800">
                          {r.title}
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-slate-700">
                          {r.score} / {r.total}
                        </td>
                        <td className="px-5 py-3.5">
                          <PctBadge pct={pct} />
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-slate-600">
                          {fmtDuration(r.time_spent_seconds)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {fmtDate(r.submitted_at)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/student/quiz/${r.quiz_id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                          >
                            Review
                            <ChevronRight className="h-3 w-3" />
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
                const pct =
                  r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                return (
                  <Link
                    key={r.id}
                    href={`/student/quiz/${r.quiz_id}`}
                    className="block px-4 py-3.5 transition active:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="line-clamp-1 flex-1 font-medium text-slate-800">
                        {r.title}
                      </span>
                      <PctBadge pct={pct} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs tabular-nums text-slate-500">
                      <span>
                        {r.score}/{r.total}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>{fmtDuration(r.time_spent_seconds)}</span>
                      <span className="text-slate-300">·</span>
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

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "sky" | "emerald" | "amber" | "violet";
}) {
  const accents = {
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  } as const;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${accents[accent]}`}>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
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

  const statusBadge = quiz.attempted ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Done
    </span>
  ) : w.status === "active" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
      Live
    </span>
  ) : w.status === "upcoming" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
      <Clock className="h-3 w-3" /> Soon
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      Closed
    </span>
  );

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md hover:shadow-sky-100/60">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-semibold text-slate-900">
          {quiz.title}
        </h3>
        {statusBadge}
      </div>

      {/* Description */}
      {quiz.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {quiz.description}
        </p>
      )}

      {/* Meta */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <ClipboardList className="h-3.5 w-3.5" />
          {quiz.question_count} questions
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {quiz.duration_minutes} min
        </span>
      </div>

      {/* Live timer line */}
      {!quiz.attempted && w.status !== "expired" && (
        <div className="mt-2 text-xs">
          {w.status === "upcoming" && (
            <span className="text-amber-700">
              Starts in{" "}
              <strong className="font-semibold tabular-nums">
                {formatCountdown(w.remainingSeconds)}
              </strong>
            </span>
          )}
          {w.status === "active" && (
            <span className="font-medium text-sky-700">
              Ends in{" "}
              <strong className="font-semibold tabular-nums">
                {formatCountdown(w.remainingSeconds)}
              </strong>
            </span>
          )}
        </div>
      )}

      {/* Action */}
      <div className="mt-4">
        {attemptable ? (
          <Link
            href={`/student/quiz/${quiz.id}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98]"
          >
            <PlayCircle className="h-4 w-4" />
            Start quiz
          </Link>
        ) : quiz.attempted ? (
          <Link
            href={`/student/quiz/${quiz.id}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
          >
            Review answers
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400"
          >
            Not available
          </button>
        )}
      </div>
    </div>
  );
}

function PctBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 75
      ? "bg-emerald-50 text-emerald-700"
      : pct >= 50
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${tone}`}
    >
      {pct}%
    </span>
  );
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{desc}</p>
    </div>
  );
}

function CenterSpinner({ label }: { label: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

function CenterError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="grid place-items-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        Failed to load dashboard
      </h2>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                         */
/* ------------------------------------------------------------------ */

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