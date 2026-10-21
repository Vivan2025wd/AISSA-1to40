"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Trophy,
  Medal,
  Crown,
  School as SchoolIcon,
  Search,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface RankRow {
  student_id: string;
  full_name: string;
  school: string;
  total_score: number;
  total_quizzes: number;
  total_time: number;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function LeaderboardPage() {
  const [rows, setRows] = useState<RankRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    return Promise.all([
      supabase.rpc("get_student_leaderboard", { p_limit: 500 }),
      supabase.auth.getUser(),
    ]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboard = async () => {
      const [{ data: lb, error: rpcErr }, { data: { user } }] = await load();
      if (cancelled) return;

      setError(null);
      if (rpcErr) {
        setError(rpcErr.message);
        setLoading(false);
        return;
      }

      setRows((lb ?? []) as RankRow[]);
      setMe(user?.id ?? null);
      setLoading(false);
    };

    void fetchLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    void load().then(([{ data: lb, error: rpcErr }, { data: { user } }]) => {
      setError(null);
      if (rpcErr) {
        setError(rpcErr.message);
        setLoading(false);
        return;
      }

      setRows((lb ?? []) as RankRow[]);
      setMe(user?.id ?? null);
      setLoading(false);
    });
  }, [load]);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
          <span className="text-sm">Loading leaderboard…</span>
        </div>
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Failed to load leaderboard
          </h2>
          <p className="mt-1 text-sm text-slate-600">{error}</p>
          <button
            onClick={retry}
            className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] sm:py-2.5"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Filter + me ---------- */
  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.school.toLowerCase().includes(q)
      )
    : rows;

  const myIndex = rows.findIndex((r) => r.student_id === me);
  const myRow = myIndex >= 0 ? rows[myIndex] : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ============ Header ============ */}
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <Trophy className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Leaderboard
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Island-wide student rankings
          </p>
        </div>
      </header>

      {/* ============ Pinned: your rank ============ */}
      {myRow && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-linear-to-r from-sky-50 to-white px-4 py-3.5 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500 text-sm font-bold text-white shadow-sm shadow-sky-500/30">
              #{myIndex + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-slate-900">
                  {myRow.full_name}
                </span>
                <span className="shrink-0 rounded-full bg-sky-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  You
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                <SchoolIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{myRow.school}</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-lg font-bold tabular-nums tracking-tight text-sky-700">
              {myRow.total_score}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {myRow.total_quizzes} exam
              {myRow.total_quizzes !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}

      {/* ============ Search ============ */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:py-2.5"
          placeholder="Search by name or school…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* ============ Table / list ============ */}
      {filtered.length === 0 ? (
        <EmptyState hasRows={rows.length > 0} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* ---------- Desktop table ---------- */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-20 px-5 py-3">Rank</th>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">School</th>
                  <th className="px-5 py-3 text-right">Exams</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const realIndex = rows.indexOf(r);
                  const isMe = r.student_id === me;
                  return (
                    <tr
                      key={r.student_id}
                      className={`transition ${
                        isMe ? "bg-sky-50/60" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <RankBadge rank={realIndex + 1} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">
                            {r.full_name}
                          </span>
                          {isMe && (
                            <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-60 truncate px-5 py-3 text-slate-600">
                        {r.school}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                        {r.total_quizzes}
                      </td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-900">
                        {r.total_score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ---------- Mobile list ---------- */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {filtered.map((r) => {
              const realIndex = rows.indexOf(r);
              const isMe = r.student_id === me;
              return (
                <div
                  key={r.student_id}
                  className={`flex items-center gap-3 px-4 py-4 transition ${
                    isMe ? "bg-sky-50/60" : ""
                  }`}
                >
                  <RankBadge rank={realIndex + 1} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-slate-800">
                        {r.full_name}
                      </span>
                      {isMe && (
                        <span className="shrink-0 rounded-full bg-sky-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                          You
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <SchoolIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{r.school}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold tabular-nums text-slate-900">
                      {r.total_score}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500">
                      {r.total_quizzes} exam
                      {r.total_quizzes !== 1 ? "s" : ""}
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

/* ------------------------------------------------------------------ */
/*  Rank badge                                                        */
/* ------------------------------------------------------------------ */

function RankBadge({
  rank,
  size = "sm",
}: {
  rank: number;
  size?: "sm" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "h-10 w-10 sm:h-9 sm:w-9" : "h-9 w-9";

  if (rank === 1) {
    return (
      <span
        className={`grid ${sizeClass} shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 shadow-sm shadow-amber-500/10`}
      >
        <Crown className="h-4 w-4" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className={`grid ${sizeClass} shrink-0 place-items-center rounded-xl bg-slate-200 text-slate-600`}
      >
        <Medal className="h-4 w-4" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className={`grid ${sizeClass} shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700`}
      >
        <Medal className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span
      className={`grid ${sizeClass} shrink-0 place-items-center rounded-xl bg-slate-50 text-sm font-semibold tabular-nums text-slate-500`}
    >
      {rank}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                       */
/* ------------------------------------------------------------------ */

function EmptyState({ hasRows }: { hasRows: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        {hasRows ? (
          <Search className="h-6 w-6" />
        ) : (
          <Trophy className="h-6 w-6" />
        )}
      </div>
      <h3 className="mt-3 font-semibold text-slate-800">
        {hasRows ? "No matches found" : "No rankings yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {hasRows
          ? "Try a different name or school."
          : "Be the first to take a quiz and top the leaderboard."}
      </p>
    </div>
  );
}