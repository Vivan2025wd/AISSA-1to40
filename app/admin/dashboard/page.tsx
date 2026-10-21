"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Library,
  Users,
  CalendarClock,
  TrendingUp,
  Clock,
  BookOpen,
  ChevronRight,
  AlertTriangle,
  Inbox,
  Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getQuizWindow } from "@/lib/quiz-window";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Snapshot {
  questions: number;
  students: number;
  quizzes: number;
  published: number;
  results: number;
  recent: {
    id: string;
    score: number;
    total: number;
    submitted_at: string;
    profile: { full_name: string; school: string } | null;
    quiz: { title: string } | null;
  }[];
  topics: { topic: string; count: number }[];
  upcoming: {
    id: string;
    title: string;
    scheduled_at: string;
    duration_minutes: number;
    is_published: boolean;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [
        qCount,
        sCount,
        qzCount,
        pubCount,
        rCount,
        recentRes,
        topicsRes,
        upcomingRes,
      ] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_admin", false),
        supabase.from("quizzes").select("id", { count: "exact", head: true }),
        supabase
          .from("quizzes")
          .select("id", { count: "exact", head: true })
          .eq("is_published", true),
        supabase
          .from("quiz_results")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("quiz_results")
          .select(
            `
            id, score, total, submitted_at,
            profile:profiles (full_name, school),
            quiz:quizzes (title)
          `
          )
          .order("submitted_at", { ascending: false })
          .limit(8),

        supabase.from("questions").select("topic"),

        supabase
          .from("quizzes")
          .select("id, title, scheduled_at, duration_minutes, is_published")
          .order("scheduled_at", { ascending: true })
          .limit(5),
      ]);

      if (recentRes.error || topicsRes.error || upcomingRes.error) {
        setError(
          recentRes.error?.message ??
            topicsRes.error?.message ??
            upcomingRes.error?.message ??
            "Failed to load dashboard"
        );
        setLoading(false);
        return;
      }

      const topicMap = new Map<string, number>();
      for (const row of topicsRes.data ?? []) {
        const t = row.topic ?? "General";
        topicMap.set(t, (topicMap.get(t) ?? 0) + 1);
      }
      const topics = [...topicMap.entries()]
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count);

      setData({
        questions: qCount.count ?? 0,
        students: sCount.count ?? 0,
        quizzes: qzCount.count ?? 0,
        published: pubCount.count ?? 0,
        results: rCount.count ?? 0,
        recent: (recentRes.data ?? []).map((row) => ({
          ...row,
          profile: Array.isArray(row.profile)
            ? row.profile[0] ?? null
            : row.profile,
          quiz: Array.isArray(row.quiz) ? row.quiz[0] ?? null : row.quiz,
        })) as Snapshot["recent"],
        topics,
        upcoming: (upcomingRes.data ?? []) as Snapshot["upcoming"],
      });
      setLoading(false);
    })();
  }, []);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
          <span className="text-sm">Loading overview…</span>
        </div>
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Failed to load dashboard
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {error ?? "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ============ Header ============ */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Platform at a glance
        </p>
      </header>

      {/* ============ Stat cards ============ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          icon={<Library className="h-5 w-5" />}
          label="Questions"
          value={data.questions}
          tone="sky"
        />
        <Stat
          icon={<Users className="h-5 w-5" />}
          label="Students"
          value={data.students}
          tone="emerald"
        />
        <Stat
          icon={<CalendarClock className="h-5 w-5" />}
          label="Quizzes"
          value={data.quizzes}
          tone="amber"
        />
        <Stat
          icon={<BookOpen className="h-5 w-5" />}
          label="Published"
          value={data.published}
          tone="violet"
        />
        {/* On mobile, this card spans full width to prevent lonely gap */}
        <div className="col-span-2 sm:col-span-1">
          <Stat
            icon={<TrendingUp className="h-5 w-5" />}
            label="Submissions"
            value={data.results}
            tone="rose"
          />
        </div>
      </div>

      {/* ============ Two-column: topics + upcoming ============ */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* ---- Topics ---- */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-1">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              Topics
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Question distribution
            </p>
          </div>

          <div className="p-4 sm:p-5">
            {data.topics.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <Library className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-500">No questions yet</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {data.topics.map((t) => {
                  const pct =
                    data.questions > 0
                      ? (t.count / data.questions) * 100
                      : 0;
                  return (
                    <li key={t.topic}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-slate-800">
                          {t.topic}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-slate-500">
                          {t.count}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-sky-500 to-sky-400 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ---- Upcoming quizzes ---- */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Upcoming quizzes
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Next scheduled sessions
              </p>
            </div>
            <Link
              href="/admin/quizzes"
              className="shrink-0 text-xs font-semibold text-sky-600 transition hover:text-sky-700 hover:underline"
            >
              View all
            </Link>
          </div>

          {data.upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400">
                <CalendarClock className="h-5 w-5" />
              </div>
              <p className="text-xs text-slate-500">
                No upcoming quizzes scheduled
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.upcoming.map((q) => {
                const w = getQuizWindow(q.scheduled_at, q.duration_minutes);
                return (
                  <li key={q.id}>
                    <Link
                      href={`/admin/quizzes/${q.id}/questions`}
                      className="group flex flex-col gap-2 px-4 py-3.5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-800">
                          {q.title}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="tabular-nums">
                            {new Date(q.scheduled_at).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>{q.duration_minutes} min</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                        <QuizStatusBadge
                          isPublished={q.is_published}
                          status={w.status}
                        />
                        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-sky-500" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ============ Recent submissions ============ */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              Recent submissions
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Latest student attempts
            </p>
          </div>
          <Link
            href="/admin/performance"
            className="shrink-0 text-xs font-semibold text-sky-600 transition hover:text-sky-700 hover:underline"
          >
            View all
          </Link>
        </div>

        {data.recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              No submissions yet
            </p>
            <p className="text-xs text-slate-500">
              Student attempts will show up here.
            </p>
          </div>
        ) : (
          <>
            {/* ---- Desktop Table (Hidden on mobile) ---- */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">School</th>
                    <th className="px-5 py-3">Quiz</th>
                    <th className="px-5 py-3 text-right">Score</th>
                    <th className="px-5 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent.map((r) => {
                    const pct =
                      r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                    return (
                      <tr
                        key={r.id}
                        className="transition hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-3.5 font-medium text-slate-800">
                          {r.profile?.full_name ?? "—"}
                        </td>
                        <td className="max-w-50 truncate px-5 py-3.5 text-slate-600">
                          {r.profile?.school ?? "—"}
                        </td>
                        <td className="max-w-50 truncate px-5 py-3.5 text-slate-600">
                          {r.quiz?.title ?? "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <ScoreBadge score={r.score} total={r.total} pct={pct} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs tabular-nums text-slate-500">
                          {new Date(r.submitted_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ---- Mobile Stacked Cards (Hidden on desktop) ---- */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {data.recent.map((r) => {
                const pct =
                  r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                return (
                  <div key={r.id} className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-800">
                          {r.profile?.full_name ?? "Unknown Student"}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                          <BookOpen className="h-3 w-3 shrink-0" />
                          {r.profile?.school ?? "No school"}
                        </div>
                      </div>
                      <ScoreBadge score={r.score} total={r.total} pct={pct} />
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 truncate font-medium">
                        <Library className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {r.quiz?.title ?? "Deleted Quiz"}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-[10px] tabular-nums text-slate-500">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {new Date(r.submitted_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                         */
/* ------------------------------------------------------------------ */

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "sky" | "emerald" | "amber" | "violet" | "rose";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  } as const;

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <div>
        <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
          {value}
        </div>
        <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quiz status badge                                                 */
/* ------------------------------------------------------------------ */

function QuizStatusBadge({
  isPublished,
  status,
}: {
  isPublished: boolean;
  status: "upcoming" | "active" | "expired";
}) {
  if (!isPublished) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        Draft
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        Live
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
        <Clock className="h-2.5 w-2.5" />
        Soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      Closed
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Score badge                                                       */
/* ------------------------------------------------------------------ */

function ScoreBadge({
  score,
  total,
  pct,
}: {
  score: number;
  total: number;
  pct: number;
}) {
  const tone =
    pct >= 75
      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
      : pct >= 50
        ? "bg-amber-50 text-amber-700 border border-amber-100"
        : "bg-red-50 text-red-700 border border-red-100";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tabular-nums shadow-sm ${tone}`}
    >
      {score}/{total}
    </span>
  );
}