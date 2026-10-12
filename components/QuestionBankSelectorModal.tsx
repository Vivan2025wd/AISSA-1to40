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
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { QUESTION_TOPICS, type QuestionTopic } from "./QuestionEntryForm";

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

  /* ---------- actions ---------- */

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
      // DB trigger raises P0001 with "limit exceeded"
      if (dbErr.code === "P0001" || dbErr.message.includes("limit exceeded")) {
        setError("ප්‍රශ්නාවලියට උපරිම ප්‍රශ්න 20ක් පමණි.");
      } else {
        setError(dbErr.message);
      }
      return;
    }

    onAdded(selected.size);
  }

  /* ---------- render ---------- */

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4">
      <div className="mx-auto my-8 w-full max-w-2xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">ප්‍රශ්න තෝරන්න</h2>
            <p className="text-xs text-slate-500">
              තෝරා ඇත:{" "}
              <strong className="text-slate-800">{selected.size}</strong> / {slotsLeft}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Filters */}
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="ප්‍රශ්න සොයන්න..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="relative sm:w-44">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              className="input pl-9"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value as QuestionTopic | "all")}
            >
              <option value="all">සියලු විෂය</option>
              {QUESTION_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick actions */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2 text-xs">
            <span className="text-slate-500">
              {filtered.length} available
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllVisible}
                disabled={!canSelectMore}
                className="text-brand-600 hover:underline disabled:opacity-40"
              >
                දෘශ්‍යමාන සියල්ල තෝරන්න
              </button>
              {selected.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-slate-500 hover:underline"
                >
                  ඉවත් කරන්න
                </button>
              )}
            </div>
          </div>
        )}

        {/* List */}
        <div className="max-h-[50vh] overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {all.length === 0
                ? "බැංකුවේ ප්‍රශ්න නොමැත. පළමුව ප්‍රශ්න එක් කරන්න."
                : "ගැලපෙන ප්‍රශ්න නොමැත."}
            </p>
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
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? "border-brand-500 bg-brand-50"
                          : atCap
                            ? "border-slate-200 opacity-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${
                          isSelected
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="badge bg-slate-100 text-slate-700">
                          {q.topic}
                        </span>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-800">
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

        {/* Error */}
        {error && (
          <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Footer */}
        <footer className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
          <span className="text-xs text-slate-500">
            {canSelectMore
              ? `${available} ක් තව තෝරාගත හැක`
              : <span className="font-medium text-red-600">පිරී ඇත (max 20)</span>}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="btn-outline">
              අවලංගු
            </button>
            <button
              onClick={add}
              disabled={saving || selected.size === 0}
              className="btn-primary"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {selected.size > 0 ? `${selected.size} ක් එක් කරන්න` : "එක් කරන්න"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}