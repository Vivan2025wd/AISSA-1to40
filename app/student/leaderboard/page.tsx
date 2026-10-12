
"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Trophy,
  Medal,
  Crown,
  School as SchoolIcon,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface RankRow {
  student_id: string;
  full_name: string;
  school: string;
  total_score: number;
  total_quizzes: number;
  total_time: number;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<RankRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: lb, error }, { data: { user } }] = await Promise.all([
        supabase.rpc("get_student_leaderboard", { p_limit: 500 }),
        supabase.auth.getUser(),
      ]);
      if (!error) setRows((lb ?? []) as RankRow[]);
      setMe(user?.id ?? null);
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

  const filtered = query.trim()
    ? rows.filter(
        (r) =>
          r.full_name.toLowerCase().includes(query.toLowerCase()) ||
          r.school.toLowerCase().includes(query.toLowerCase())
      )
    : rows;

  const myIndex = rows.findIndex((r) => r.student_id === me);
  const myRow = myIndex >= 0 ? rows[myIndex] : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">දිවයින පුරා ශ්‍රේණිගත කිරීම්</h1>
          <p className="text-sm text-slate-600">Island-wide student rankings</p>
        </div>
      </div>

      {/* Pinned: your rank */}
      {myRow && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border-2 border-brand-200 bg-brand-50/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
              #{myIndex + 1}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-brand-900">
                {myRow.full_name} <span className="text-xs font-normal text-brand-700">(ඔබ)</span>
              </div>
              <div className="truncate text-xs text-brand-700">{myRow.school}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-brand-700">{myRow.total_score}</div>
            <div className="text-[10px] uppercase tracking-wide text-brand-600">
              {myRow.total_quizzes} exams
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          className="input pl-9"
          placeholder="නම හෝ පාසල අනුව සොයන්න..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-slate-600">
          {rows.length === 0
            ? "තවම ප්‍රතිඵල නොමැත. පළමු ප්‍රශ්නාවලියට සහභාගී වන්න!"
            : "ගැලපෙන ප්‍රතිඵල නොමැත."}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-16 px-4 py-3 font-medium">ස්ථානය</th>
                  <th className="px-4 py-3 font-medium">සිසුවා</th>
                  <th className="px-4 py-3 font-medium">පාසල</th>
                  <th className="px-4 py-3 text-right font-medium">විභාග</th>
                  <th className="px-4 py-3 text-right font-medium">මුළු ලකුණු</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const realIndex = rows.indexOf(r);
                  const isMe = r.student_id === me;
                  return (
                    <tr
                      key={r.student_id}
                      className={isMe ? "bg-brand-50/60" : "hover:bg-slate-50"}
                    >
                      <td className="px-4 py-3">
                        <RankBadge rank={realIndex + 1} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">
                          {r.full_name}
                          {isMe && (
                            <span className="ml-2 text-xs font-semibold text-brand-600">
                              (ඔබ)
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.school}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.total_quizzes}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {r.total_score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {filtered.map((r) => {
              const realIndex = rows.indexOf(r);
              const isMe = r.student_id === me;
              return (
                <div
                  key={r.student_id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    isMe ? "bg-brand-50/60" : ""
                  }`}
                >
                  <RankBadge rank={realIndex + 1} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {r.full_name}
                      {isMe && (
                        <span className="ml-1 text-xs font-semibold text-brand-600">(ඔබ)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 truncate text-xs text-slate-500">
                      <SchoolIcon className="h-3 w-3 shrink-0" />
                      {r.school}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{r.total_score}</div>
                    <div className="text-[10px] text-slate-500">
                      {r.total_quizzes} exams
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-amber-700">
        <Crown className="h-4 w-4" />
      </span>
    );
  if (rank === 2)
    return (
      <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-slate-600">
        <Medal className="h-4 w-4" />
      </span>
    );
  if (rank === 3)
    return (
      <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-orange-700">
        <Medal className="h-4 w-4" />
      </span>
    );
  return (
    <span className="grid h-8 w-8 place-items-center text-sm font-semibold text-slate-500">
      {rank}
    </span>
  );
}