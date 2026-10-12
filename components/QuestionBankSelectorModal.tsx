"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  X,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Library,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { QUESTION_TOPICS, type QuestionTopic } from "./QuestionEntryForm";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface QuestionLite {
  id: string;
  topic: string;
  question_text_si: string;
  question_text_en: string | null;
}

interface Props {
  quizId: string;
  /** IDs already linked to this quiz (excluded from the list) */
  existingIds: string[];
  /** How many more questions can be added (20 - existing) */
  slotsLeft: number;
  onClose: () => void;
  onAdded: (added: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function QuestionBankSelectorModal({
  quizId,
  existingIds,
  slotsLeft,
  onClose,
  onAdded,
}: Props) {
  const [all, setAll] = useState<QuestionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<QuestionTopic | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Load question bank */
  useEffect(() => {
    (async () => {
      const { data, error: dbErr } = await supabase
        .from("questions")
        .select("id, topic, question_text_si, question_text_en")
        .order("created_at", { ascending: false });
      if (dbErr) setError(dbErr.message);
      setAll((data ?? []) as QuestionLite[]);
      setLoading(false);
    })();
  }, []);

  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((x) => {
      if (existingSet.has(x.id)) return false;
      if (topicFilter !== "all" && x.topic !== topicFilter) return false;
      if (!q) return true;
      return (
        x.question_text_si.toLowerCase().includes(q) ||
        (x.question_text_en ?? "").toLowerCase().includes(q)
      );
    });
  }, [all, query, topicFilter, existingSet]);

  const available = slotsLeft - selected.size;
  const canSelectMore = available > 0;

  /* ---------- Actions ---------- */

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < slotsLeft) next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const q of filtered) {
        if (next.size >= slotsLeft) break;
        next.add(q.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function add() {
    if (selected.size === 0) return;
    setError(null);
    setSaving(true);

    const startIndex = existingIds.length;
    const rows = [...selected].map((qid, i) => ({
      quiz_id: quizId,
      question_id: qid,
      order_index: startIndex + i,
    }));

    const { error: dbErr } = await supabase.from("quiz_questions").insert(rows);
    setSaving(false);

    if (dbErr) {
      if (dbErr.code === "P0001" || dbErr.message.includes("limit exceeded")) {
        setError("A quiz can hold a maximum of 20 questions.");
      } else {
        setError(dbErr.message);
      }
      return;
    }

    onAdded(selected.size);
  }

  /* ---------- Render ---------- */

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:my-8">
        {/* ============ Header ============ */}
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
              <Library className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                Add questions
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Selected{" "}
                <strong className="font-semibold text-slate-800">
                  {selected.size}
                </strong>{" "}
                of {slotsLeft}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Capacity bar */}
        <div className="border-b border-slate-100 px-4 pb-3 pt-2 sm:px-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-300 ${
                !canSelectMore ? "bg-red-500" : "bg-sky-500"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  ((existingIds.length + selected.size) / 20) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* ============ Filters ============ */}
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:px-5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              placeholder="Search questions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="relative sm:w-48">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              value={topicFilter}
              onChange={(e) =>
                setTopicFilter(e.target.value as QuestionTopic | "all")
              }
            >
              <option value="all">All topics</option>
              {QUESTION_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ============ Quick actions ============ */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-xs sm:px-5">
            <span className="font-medium text-slate-500">
              {filtered.length} available
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllVisible}
                disabled={!canSelectMore}
                className="font-semibold text-sky-600 transition hover:text-sky-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
              >
                Select all
              </button>
              {selected.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="font-medium text-slate-500 transition hover:text-slate-700 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============ List ============ */}
        <div className="max-h-[50vh] overflow-y-auto px-4 py-3 sm:px-5">
          {loading ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                <Library className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-500">
                {all.length === 0
                  ? "The question bank is empty. Add questions first."
                  : "No questions match your filters."}
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((q) => {
                const isSelected = selected.has(q.id);
                const atCap = !canSelectMore && !isSelected;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => !atCap && toggle(q.id)}
                      disabled={atCap}
                      className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-sky-400 bg-sky-50 shadow-sm shadow-sky-500/5"
                          : atCap
                            ? "cursor-not-allowed border-slate-200 opacity-50"
                            : "border-slate-200 hover:border-sky-200 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${
                          isSelected
                            ? "border-sky-500 bg-sky-500 text-white"
                            : "border-slate-300 bg-white group-hover:border-slate-400"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            isSelected
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {q.topic}
                        </span>
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-800">
                          {q.question_text_si}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ============ Error ============ */}
        {error && (
          <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ============ Footer ============ */}
        <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-xs">
            {canSelectMore ? (
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                <span>
                  <strong className="font-semibold text-slate-800">
                    {available}
                  </strong>{" "}
                  more can be added
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Full — max 20 questions per quiz
              </span>
            )}
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
            >
              Cancel
            </button>
            <button
              onClick={add}
              disabled={saving || selected.size === 0}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none sm:flex-none"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {selected.size > 0
                ? `Add ${selected.size}`
                : "Add questions"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}