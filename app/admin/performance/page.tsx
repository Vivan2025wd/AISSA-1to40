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
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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

export default function PerformancePage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizFilter, setQuizFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [resRes, qzRes] = await Promise.all([
        supabase
          .from("quiz_results")
          .select(`
            id, score, total, time_spent_seconds, submitted_at,
            student:profiles (id, full_name, school),
            quiz:quizzes (id, title)
          `)
          .order("submitted_at", { ascending: false }),
        supabase.from("quizzes").select("id, title").order("scheduled_at", { ascending: false }),
      ]);
      setRows((resRes.data ?? []) as any);
      setQuizzes((qzRes.data ?? []) as QuizOption[]);
      setLoading(false);
    })();
  }, []);

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

  const stats = useMemo(() => {
    if (filtered.length === 0) return { count: 0, avg: 0, top: 0, students: 0 };
    const pcts = filtered.map((r) => (r.total > 0 ? (r.score / r.total) * 100 : 0));
    return {
      count: filtered.length,
      avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      top: Math.round(Math.max(...pcts)),
      students: new Set(filtered.map((r) => r.student?.id).filter(Boolean)).size,
    };
  }, [filtered]);

  function exportCSV() {
    const header = ["Student", "School", "Quiz", "Score", "Total", "Percent", "Time (s)", "Submitted"];
    const lines = filtered.map((r) => [
      csv(r.student?.full_name ?? ""),
      csv(r.student?.school ?? ""),
      csv(r.quiz?.title ?? ""),
      r.score,
      r.total,
      r.total > 0 ? Math.round((r.score / r.total) * 100) : 0,
      r.time_spent_seconds,
      new Date(r.submitted_at).toISOString(),
    ].join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aissa-ol-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">ප්‍රතිඵල</h1>
          <p className="mt-1 text-sm text-slate-600">
            Student attempts · {rows.length} records
          </p>
        </div>
        <button onClick={exportCSV} disabled={filtered.length === 0} className="btn-outline">
          <Download className="h-4 w-4" /> CSV අපනයනය
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat icon={<Users className="h-4 w-4" />} label="සම්පූර්ණ" value={stats.count} />
        <MiniStat icon={<Users className="h-4 w-4" />} label="සිසුන්" value={stats.students} />
        <MiniStat icon={<Target className="h-4 w-4" />} label="සාමාන්‍ය %" value={`${stats.avg}%`} />
        <MiniStat icon={<TrendingUp className="h-4 w-4" />} label="ඉහළම %" value={`${stats.top}%`} />
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="සිසුවා හෝ පාසල සොයන්න..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="relative sm:w-64">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            className="input pl-9"
            value={quizFilter}
            onChange={(e) => setQuizFilter(e.target.value)}
          >
            <option value="all">සියලු ප්‍රශ්නාවලි</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card mt-5 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-600">
            {rows.length === 0 ? "තවම ප්‍රතිඵල නොමැත." : "ගැලපෙන ප්‍රතිඵල නොමැත."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">සිසුවා</th>
                  <th className="px-5 py-3 font-medium">පාසල</th>
                  <th className="px-5 py-3 font-medium">ප්‍රශ්නාවලිය</th>
                  <th className="px-5 py-3 text-right font-medium">ලකුණු</th>
                  <th className="px-5 py-3 text-right font-medium">%</th>
                  <th className="px-5 py-3 text-right font-medium">වේලාව</th>
                  <th className="px-5 py-3 text-right font-medium">දිනය</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {r.student?.full_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{r.student?.school ?? "—"}</td>
                      <td className="max-w-55 truncate px-5 py-3 text-slate-600">
                        {r.quiz?.title ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {r.score} / {r.total}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`badge ${
                            pct >= 75
                              ? "bg-green-50 text-green-700"
                              : pct >= 50
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {fmtDuration(r.time_spent_seconds)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-slate-500">
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

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function csv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}