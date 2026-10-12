"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Download,
  Filter,
  Search,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  Inbox,
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ResultRow {
  id: string;
  score: number;
  total: number;
  time_spent_seconds: number;
  submitted_at: string;
  student: { id: string; full_name: string; school: string } | null;
  quiz: { id: string; title: string } | null;
}

interface QuizOption {
  id: string;
  title: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function PerformancePage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizFilter, setQuizFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [resRes, qzRes] = await Promise.all([
        supabase
          .from("quiz_results")
          .select(
            `
            id, score, total, time_spent_seconds, submitted_at,
            student:profiles (id, full_name, school),
            quiz:quizzes (id, title)
          `
          )
          .order("submitted_at", { ascending: false }),
        supabase
          .from("quizzes")
          .select("id, title")
          .order("scheduled_at", { ascending: false }),
      ]);

      if (resRes.error || qzRes.error) {
        setError(
          resRes.error?.message ??
            qzRes.error?.message ??
            "Failed to load results"
        );
        setLoading(false);
        return;
      }

      setRows((resRes.data ?? []) as any);
      setQuizzes((qzRes.data ?? []) as QuizOption[]);
      setLoading(false);
    })();
  }, []);

  /* ---------- Filtered rows ---------- */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (quizFilter !== "all" && r.quiz?.id !== quizFilter) return false;
      if (!q) return true;
      return (
        (r.student?.full_name ?? "").toLowerCase().includes(q) ||
        (r.student?.school ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, quizFilter, query]);

  /* ---------- Stats ---------- */

  const stats = useMemo(() => {
    if (filtered.length === 0) return { count: 0, avg: 0, top: 0, students: 0 };
    const pcts = filtered.map((r) =>
      r.total > 0 ? (r.score / r.total) * 100 : 0
    );
    return {
      count: filtered.length,
      avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      top: Math.round(Math.max(...pcts)),
      students: new Set(filtered.map((r) => r.student?.id).filter(Boolean))
        .size,
    };
  }, [filtered]);

  /* ---------- CSV export ---------- */

  function exportCSV() {
    const header = [
      "Student",
      "School",
      "Quiz",
      "Score",
      "Total",
      "Percent",
      "Time (s)",
      "Submitted",
    ];
    const lines = filtered.map((r) =>
      [
        csv(r.student?.full_name ?? ""),
        csv(r.student?.school ?? ""),
        csv(r.quiz?.title ?? ""),
        r.score,
        r.total,
        r.total > 0 ? Math.round((r.score / r.total) * 100) : 0,
        r.time_spent_seconds,
        new Date(r.submitted_at).toISOString(),
      ].join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ol-science-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
          <span className="text-sm">Loading results…</span>
        </div>
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Failed to load results
        </h2>
        <p className="mt-1 text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ============ Header ============ */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Performance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} total attempt{rows.length !== 1 ? "s" : ""}
            {quizFilter !== "all" && (
              <span className="text-slate-400">
                {" "}
                · filtered to {filtered.length}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-white disabled:hover:text-slate-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </header>

      {/* ============ Stats ============ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          icon={<ClipboardList className="h-4 w-4" />}
          label="Attempts"
          value={stats.count}
          tone="sky"
        />
        <MiniStat
          icon={<Users className="h-4 w-4" />}
          label="Students"
          value={stats.students}
          tone="violet"
        />
        <MiniStat
          icon={<Target className="h-4 w-4" />}
          label="Average"
          value={`${stats.avg}%`}
          tone="emerald"
        />
        <MiniStat
          icon={<TrendingUp className="h-4 w-4" />}
          label="Top score"
          value={`${stats.top}%`}
          tone="amber"
        />
      </div>

      {/* ============ Filters ============ */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            placeholder="Search by student or school…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Quiz filter */}
        <div className="relative sm:w-64">
          <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            value={quizFilter}
            onChange={(e) => setQuizFilter(e.target.value)}
          >
            <option value="all">All quizzes</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            ▾
          </span>
        </div>
      </div>

      {/* ============ Table ============ */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState hasRows={rows.length > 0} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">School</th>
                  <th className="px-5 py-3">Quiz</th>
                  <th className="px-5 py-3 text-right">Score</th>
                  <th className="px-5 py-3 text-right">%</th>
                  <th className="px-5 py-3 text-right">Time</th>
                  <th className="px-5 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const pct =
                    r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                  return (
                    <tr key={r.id} className="transition hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {r.student?.full_name ?? "—"}
                      </td>
                      <td className="max-w-55 truncate px-5 py-3.5 text-slate-600">
                        {r.student?.school ?? "—"}
                      </td>
                      <td className="max-w-55 truncate px-5 py-3.5 text-slate-600">
                        {r.quiz?.title ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-700">
                        {r.score} / {r.total}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <PctBadge pct={pct} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-600">
                        {fmtDuration(r.time_spent_seconds)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs tabular-nums text-slate-500">
                        {new Date(r.submitted_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini stat                                                         */
/* ------------------------------------------------------------------ */

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "sky" | "violet" | "emerald" | "amber";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  } as const;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tones[tone]}`}>
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Percentage badge                                                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Empty state                                                       */
/* ------------------------------------------------------------------ */

function EmptyState({ hasRows }: { hasRows: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        {hasRows ? (
          <Search className="h-6 w-6" />
        ) : (
          <Inbox className="h-6 w-6" />
        )}
      </div>
      <p className="text-sm font-semibold text-slate-800">
        {hasRows ? "No matching results" : "No results yet"}
      </p>
      <p className="max-w-sm text-xs leading-relaxed text-slate-500">
        {hasRows
          ? "Try a different search term or quiz filter."
          : "Student attempts will appear here once they start submitting quizzes."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function csv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}