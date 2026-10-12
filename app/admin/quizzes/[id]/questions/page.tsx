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
  ListOrdered,
  GripVertical,
  CheckCircle2,
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
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removing, setRemoving] = useState<LinkedQuestion | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* ---------- Load ---------- */

  async function load() {
    setLoading(true);
    setError(null);

    const [{ data: q, error: quizErr }, { data: links, error: linksErr }] =
      await Promise.all([
        supabase
          .from("quizzes")
          .select("id, title")
          .eq("id", quizId)
          .maybeSingle(),
        supabase
          .from("quiz_questions")
          .select(
            `
            id, order_index,
            question:questions (id, topic, question_text_si, question_text_en)
          `
          )
          .eq("quiz_id", quizId)
          .order("order_index", { ascending: true }),
      ]);

    if (quizErr || linksErr) {
      setError(quizErr?.message ?? linksErr?.message ?? "Failed to load");
      setLoading(false);
      return;
    }

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

  /* ---------- Auto-dismiss toast ---------- */

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- Reorder ---------- */

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

  /* ---------- Remove ---------- */

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
      setToast("Question removed");
    }
  }

  /* ---------- Loading ---------- */

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
          <span className="text-sm">Loading quiz…</span>
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
          Failed to load quiz
        </h2>
        <p className="mt-1 text-sm text-slate-600">{error}</p>
        <Link
          href="/admin/quizzes"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to quizzes
        </Link>
      </div>
    );
  }

  const slotsLeft = MAX_QUESTIONS - linked.length;
  const capReached = slotsLeft <= 0;
  const capacityPct = (linked.length / MAX_QUESTIONS) * 100;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ============ Back link ============ */}
      <Link
        href="/admin/quizzes"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to quizzes
      </Link>

      {/* ============ Header ============ */}
      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600">
            <ListOrdered className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {quiz?.title ?? "Untitled quiz"}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {linked.length} / {MAX_QUESTIONS} questions linked
            </p>
          </div>
        </div>

        <button
          onClick={() => setPickerOpen(true)}
          disabled={capReached}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          <Plus className="h-4 w-4" /> Add questions
        </button>
      </header>

      {/* ============ Capacity bar ============ */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-500">
            Capacity
          </span>
          <span
            className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
              capReached ? "text-red-600" : "text-slate-700"
            }`}
          >
            {linked.length} / {MAX_QUESTIONS}
            {capReached && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Full
              </span>
            )}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              capReached
                ? "bg-red-500"
                : "bg-linear-to-r from-sky-500 to-sky-400"
            }`}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      </div>

      {/* ============ List ============ */}
      <div className="mt-5">
        {linked.length === 0 ? (
          <EmptyState onAdd={() => setPickerOpen(true)} />
        ) : (
          <ol className="space-y-2">
            {linked.map((q, i) => (
              <li
                key={q.link_id}
                className={`group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition sm:p-4 ${
                  busyId === q.link_id
                    ? "opacity-60"
                    : "hover:border-sky-200 hover:shadow-md hover:shadow-sky-100/60"
                }`}
              >
                {/* Position number */}
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold tabular-nums transition ${
                    i === 0
                      ? "bg-sky-500 text-white shadow-sm shadow-sky-500/25"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {i + 1}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                      {q.topic}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm font-medium leading-relaxed text-slate-800">
                    {q.question_text_si}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busyId === q.link_id}
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move up"
                    aria-label={`Move question ${i + 1} up`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={
                      i === linked.length - 1 || busyId === q.link_id
                    }
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move down"
                    aria-label={`Move question ${i + 1} down`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setRemoving(q)}
                    disabled={busyId === q.link_id}
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Remove"
                    aria-label={`Remove question ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ============ Add questions modal ============ */}
      {pickerOpen && (
        <QuestionBankSelectorModal
          quizId={quizId}
          existingIds={linked.map((l) => l.id)}
          slotsLeft={slotsLeft}
          onClose={() => setPickerOpen(false)}
          onAdded={(count) => {
            setPickerOpen(false);
            setToast(
              `${count} question${count !== 1 ? "s" : ""} added`
            );
            load();
          }}
        />
      )}

      {/* ============ Remove confirmation ============ */}
      {removing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={() => setRemoving(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
                Remove this question?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                The question will be unlinked from this quiz. It stays in the
                bank and can be added again anytime.
              </p>

              <p className="mt-3 line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-xs text-slate-700">
                {removing.question_text_si}
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setRemoving(null)}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={remove}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-500/25 transition hover:bg-red-700 active:scale-[0.98]"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ Toast ============ */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-60 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                       */
/* ------------------------------------------------------------------ */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Library className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-800">
        No questions linked yet
      </h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Add questions from the bank to build this quiz. You can link up to{" "}
        {MAX_QUESTIONS}.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" /> Add questions
      </button>
    </div>
  );
}