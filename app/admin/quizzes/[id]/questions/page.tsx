"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  X,
  Trash2,
  Library,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import QuestionBankSelectorModal from "@/components/QuestionBankSelectorModal";

const MAX_QUESTIONS = 20;

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface QuestionLite {
  id: string;
  topic: string;
  question_text_si: string;
  question_text_en: string | null;
}

interface LinkedQuestion extends QuestionLite {
  link_id: string;
  order_index: number;
}

interface QuizMeta {
  id: string;
  title: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function QuizQuestionsPage() {
  const { id: quizId } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<QuizMeta | null>(null);
  const [linked, setLinked] = useState<LinkedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removing, setRemoving] = useState<LinkedQuestion | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* ---------- load ---------- */

  async function load() {
    setLoading(true);
    const [{ data: q }, { data: links }] = await Promise.all([
      supabase.from("quizzes").select("id, title").eq("id", quizId).maybeSingle(),
      supabase
        .from("quiz_questions")
        .select(`
          id, order_index,
          question:questions (id, topic, question_text_si, question_text_en)
        `)
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true }),
    ]);

    setQuiz((q as QuizMeta | null) ?? null);
    setLinked(
      (links ?? [])
        .filter((l: any) => l.question)
        .map((l: any) => ({
          link_id: l.id,
          order_index: l.order_index,
          ...(l.question as QuestionLite),
        }))
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  /* ---------- auto-dismiss toast ---------- */

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- reorder ---------- */

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= linked.length) return;

    const a = linked[index];
    const b = linked[target];
    setBusyId(a.link_id);

    // Optimistic swap
    setLinked((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((x, i) => ({ ...x, order_index: i }));
    });

    // Persist new order_index values
    await Promise.all([
      supabase
        .from("quiz_questions")
        .update({ order_index: target })
        .eq("id", a.link_id),
      supabase
        .from("quiz_questions")
        .update({ order_index: index })
        .eq("id", b.link_id),
    ]);

    setBusyId(null);
  }

  /* ---------- remove ---------- */

  async function remove() {
    if (!removing) return;
    setBusyId(removing.link_id);
    const { error } = await supabase
      .from("quiz_questions")
      .delete()
      .eq("id", removing.link_id);
    setBusyId(null);

    if (!error) {
      setLinked((prev) => prev.filter((x) => x.link_id !== removing.link_id));
      setRemoving(null);
      setToast("ප්‍රශ්නය ඉවත් කරන ලදී");
    }
  }

  /* ---------- render ---------- */

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const slotsLeft = MAX_QUESTIONS - linked.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/admin/quizzes"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> ප්‍රශ්නාවලි ලැයිස්තුව
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {quiz?.title ?? "—"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            ප්‍රශ්න කළමනාකරණය · {linked.length} / {MAX_QUESTIONS}
          </p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          disabled={slotsLeft <= 0}
          className="btn-primary disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> ප්‍රශ්න එක් කරන්න
        </button>
      </div>

      {/* Capacity bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>ධාරිතාව</span>
          <span className="font-medium text-slate-800">
            {linked.length} / {MAX_QUESTIONS}
            {slotsLeft === 0 && <span className="ml-1 text-red-600">· පිරී ඇත</span>}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full transition-all ${
              slotsLeft === 0 ? "bg-red-500" : "bg-brand-600"
            }`}
            style={{ width: `${(linked.length / MAX_QUESTIONS) * 100}%` }}
          />
        </div>
      </div>

      {/* List */}
      <div className="mt-5">
        {linked.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
              <Library className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              තවම ප්‍රශ්න සම්බන්ධ කර නොමැත.
            </p>
            <button
              onClick={() => setPickerOpen(true)}
              className="btn-primary mt-4"
            >
              <Plus className="h-4 w-4" /> ප්‍රශ්න එක් කරන්න
            </button>
          </div>
        ) : (
          <ol className="space-y-2">
            {linked.map((q, i) => (
              <li
                key={q.link_id}
                className={`card flex items-start gap-3 p-3 sm:p-4 transition ${
                  busyId === q.link_id ? "opacity-60" : ""
                }`}
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="badge bg-brand-50 text-brand-700">
                      {q.topic}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-slate-800">
                    {q.question_text_si}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busyId === q.link_id}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === linked.length - 1 || busyId === q.link_id}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setRemoving(q)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── Add questions modal (shared component) ── */}
      {pickerOpen && (
        <QuestionBankSelectorModal
          quizId={quizId}
          existingIds={linked.map((l) => l.id)}
          slotsLeft={slotsLeft}
          onClose={() => setPickerOpen(false)}
          onAdded={(count) => {
            setPickerOpen(false);
            setToast(`${count} ප්‍රශ්න එක් කරන ලදී`);
            load();
          }}
        />
      )}

      {/* ── Remove confirmation ── */}
      {removing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          onClick={() => setRemoving(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">ඉවත් කරන්නද?</h2>
              <p className="mt-1 text-sm text-slate-600">
                ප්‍රශ්නය මෙම ප්‍රශ්නාවලියෙන් ඉවත් වේ. බැංකුවේ රැඳේ.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setRemoving(null)}
                  className="btn-outline flex-1"
                >
                  අවලංගු
                </button>
                <button onClick={remove} className="btn-danger flex-1">
                  <Trash2 className="h-4 w-4" /> ඉවත් කරන්න
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-60 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}