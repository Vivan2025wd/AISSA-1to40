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
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getQuizWindow } from "@/lib/quiz-window";

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

export default function AdminDashboard() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [
        qCount, sCount, qzCount, pubCount, rCount,
        recentRes, topicsRes, upcomingRes,
      ] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_admin", false),
        supabase.from("quizzes").select("id", { count: "exact", head: true }),
        supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("quiz_results").select("id", { count: "exact", head: true }),

        supabase
          .from("quiz_results")
          .select(`
            id, score, total, submitted_at,
            profile:profiles (full_name, school),
            quiz:quizzes (title)
          `)
          .order("submitted_at", { ascending: false })
          .limit(8),

        supabase.from("questions").select("topic"),

        supabase
          .from("quizzes")
          .select("id, title, scheduled_at, duration_minutes, is_published")
          .order("scheduled_at", { ascending: true })
          .limit(5),
      ]);

      const topicMap = new Map<string, number>();
      for (const row of topicsRes.data ?? []) {
        const t = (row as any).topic ?? "General";
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
        recent: (recentRes.data ?? []) as any,
        topics,
        upcoming: (upcomingRes.data ?? []) as any,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">සාරාංශය</h1>
      <p className="mt-1 text-sm text-slate-600">Platform overview at a glance</p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat icon={<Library className="h-5 w-5" />} label="ප්‍රශ්න" en="Questions" value={data.questions} tone="blue" />
        <Stat icon={<Users className="h-5 w-5" />} label="සිසුන්" en="Students" value={data.students} tone="green" />
        <Stat icon={<CalendarClock className="h-5 w-5" />} label="ප්‍රශ්නාවලි" en="Quizzes" value={data.quizzes} tone="amber" />
        <Stat icon={<BookOpen className="h-5 w-5" />} label="ප්‍රකාශිත" en="Published" value={data.published} tone="purple" />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="සම්පූර්ණ" en="Submissions" value={data.results} tone="rose" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Topics */}
        <section className="card lg:col-span-1">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">විෂය ප්‍රමාණය</h2>
            <p className="text-xs text-slate-500">Question count by topic</p>
          </div>
          <div className="p-5">
            {data.topics.length === 0 ? (
              <p className="text-sm text-slate-500">තවම ප්‍රශ්න නොමැත.</p>
            ) : (
              <ul className="space-y-3">
                {data.topics.map((t) => {
                  const pct = data.questions > 0 ? (t.count / data.questions) * 100 : 0;
                  return (
                    <li key={t.topic}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{t.topic}</span>
                        <span className="text-slate-500">{t.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Upcoming quizzes */}
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">ඉදිරි ප්‍රශ්නාවලි</h2>
              <p className="text-xs text-slate-500">Next scheduled sessions</p>
            </div>
            <Link href="/admin/quizzes" className="text-xs font-semibold text-brand-600 hover:underline">
              සියල්ල
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data.upcoming.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">ප්‍රශ්නාවලි නොමැත.</p>
            ) : (
              data.upcoming.map((q) => {
                const w = getQuizWindow(q.scheduled_at, q.duration_minutes);
                return (
                  <Link
                    key={q.id}
                    href={`/admin/quizzes/${q.id}/questions`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{q.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {new Date(q.scheduled_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!q.is_published ? (
                        <span className="badge bg-slate-100 text-slate-600">කෙටුම්පත</span>
                      ) : w.status === "active" ? (
                        <span className="badge bg-green-50 text-green-700">සක්‍රීය</span>
                      ) : w.status === "upcoming" ? (
                        <span className="badge bg-amber-50 text-amber-700">ඉදිරියේ</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-600">අවසන්</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Recent submissions */}
      <section className="card mt-6">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">නවතම ඉදිරිපත් කිරීම්</h2>
            <p className="text-xs text-slate-500">Latest student submissions</p>
          </div>
          <Link href="/admin/performance" className="text-xs font-semibold text-brand-600 hover:underline">
            සියල්ල
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-140 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">සිසුවා</th>
                <th className="px-5 py-3 font-medium">පාසල</th>
                <th className="px-5 py-3 font-medium">ප්‍රශ්නාවලිය</th>
                <th className="px-5 py-3 text-right font-medium">ලකුණු</th>
                <th className="px-5 py-3 text-right font-medium">දිනය</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    තවම ඉදිරිපත් කිරීම් නොමැත.
                  </td>
                </tr>
              ) : (
                data.recent.map((r) => {
                  const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                  return (
                    <tr key={r.id}>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {r.profile?.full_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{r.profile?.school ?? "—"}</td>
                      <td className="max-w-55 truncate px-5 py-3 text-slate-600">
                        {r.quiz?.title ?? "—"}
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
                          {r.score}/{r.total}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-slate-500">
                        {new Date(r.submitted_at).toLocaleDateString("en-GB")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  en,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  en: string;
  value: number;
  tone: "blue" | "green" | "amber" | "purple" | "rose";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    rose: "bg-rose-50 text-rose-600",
  } as const;
  return (
    <div className="card p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone]}`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-700">{label}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{en}</div>
    </div>
  );
}