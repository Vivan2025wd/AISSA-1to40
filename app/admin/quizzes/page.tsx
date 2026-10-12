"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Clock,
  Calendar as CalIcon,
  Library,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  CalendarClock,
  Languages,
  Globe,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getQuizWindow } from "@/lib/quiz-window";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type Medium = "si" | "en";

interface QuizRow {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  is_published: boolean;
  medium: Medium;
  created_at: string;
  question_count?: number;
}

interface Draft {
  title: string;
  description: string;
  scheduled_at: string; // datetime-local input format
  duration_minutes: number;
  is_published: boolean;
  medium: Medium;
}

const emptyDraft: Draft = {
  title: "",
  description: "",
  scheduled_at: "",
  duration_minutes: 30,
  is_published: false,
  medium: "si",
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function QuizzesPage() {
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuizRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<QuizRow | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const { data, error: dbErr } = await supabase
      .from("quizzes")
      .select(
        "id, title, description, scheduled_at, duration_minutes, is_published, medium, created_at"
      )
      .order("scheduled_at", { ascending: false });

    if (dbErr) {
      setError(dbErr.message);
      setLoading(false);
      return;
    }

    // Fetch question counts in parallel
    const ids = (data ?? []).map((q) => q.id);
    let counts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: links } = await supabase
        .from("quiz_questions")
        .select("quiz_id")
        .in("quiz_id", ids);
      counts = (links ?? []).reduce<Record<string, number>>((acc, l: any) => {
        acc[l.quiz_id] = (acc[l.quiz_id] ?? 0) + 1;
        return acc;
      }, {});
    }

    setRows(
      ((data ?? []) as QuizRow[]).map((q) => ({
        ...q,
        question_count: counts[q.id] ?? 0,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePublish(q: QuizRow) {
    await supabase
      .from("quizzes")
      .update({ is_published: !q.is_published })
      .eq("id", q.id);
    setRows((rows) =>
      rows.map((x) =>
        x.id === q.id ? { ...x, is_published: !x.is_published } : x
      )
    );
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", deleting.id);
    if (!error) {
      setRows((r) => r.filter((x) => x.id !== deleting.id));
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ============ Header ============ */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Quizzes
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {rows.length} scheduled · Quiz Scheduler
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> New quiz
        </button>
      </header>

      {/* ============ List ============ */}
      <div>
        {loading ? (
          <div className="grid place-items-center py-16">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
              <span className="text-sm">Loading quizzes…</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-semibold text-slate-900">
              Failed to load quizzes
            </h3>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <div className="space-y-3">
            {rows.map((q) => (
              <QuizCard
                key={q.id}
                quiz={q}
                onEdit={() => setEditing(q)}
                onDelete={() => setDeleting(q)}
                onTogglePublish={() => togglePublish(q)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============ Create / edit modal ============ */}
      {(creating || editing) && (
        <QuizModal
          initial={editing ?? null}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {/* ============ Delete confirmation ============ */}
      {deleting && (
        <Modal onClose={() => setDeleting(null)}>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
            Delete this quiz?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            The quiz and its question links will be removed. Student results are
            kept.
          </p>
          <p className="mt-3 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
            {deleting.title}
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setDeleting(null)}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-500/25 transition hover:bg-red-700 active:scale-[0.98]"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quiz card                                                         */
/* ------------------------------------------------------------------ */

function QuizCard({
  quiz,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  quiz: QuizRow;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}) {
  const w = getQuizWindow(quiz.scheduled_at, quiz.duration_minutes);
  const qCount = quiz.question_count ?? 0;
  const atCap = qCount >= 20;

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md hover:shadow-sky-100/60 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Title + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900">{quiz.title}</h3>
            <StatusBadge isPublished={quiz.is_published} status={w.status} />
            <MediumBadge medium={quiz.medium} />
          </div>

          {/* Description */}
          {quiz.description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
              {quiz.description}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalIcon className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {new Date(quiz.scheduled_at).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {quiz.duration_minutes} min
            </span>
            <span
              className={`inline-flex items-center gap-1 ${
                atCap ? "text-red-600" : ""
              }`}
            >
              <Library className="h-3.5 w-3.5" />
              {qCount} / 20 questions
              {atCap && <span className="font-semibold">· full</span>}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
          <button
            onClick={onTogglePublish}
            className={`grid h-9 w-9 place-items-center rounded-lg transition active:scale-95 ${
              quiz.is_published
                ? "text-emerald-600 hover:bg-emerald-50"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            }`}
            title={quiz.is_published ? "Unpublish" : "Publish"}
            aria-label={quiz.is_published ? "Unpublish quiz" : "Publish quiz"}
          >
            {quiz.is_published ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-sky-50 hover:text-sky-600 active:scale-95"
            title="Edit"
            aria-label="Edit quiz"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 active:scale-95"
            title="Delete"
            aria-label="Delete quiz"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Footer link */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <Link
          href={`/admin/quizzes/${quiz.id}/questions`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 transition hover:text-sky-700"
        >
          Manage questions
          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status + medium badges                                            */
/* ------------------------------------------------------------------ */

function StatusBadge({
  isPublished,
  status,
}: {
  isPublished: boolean;
  status: "upcoming" | "active" | "expired";
}) {
  if (!isPublished) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        Draft
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        Live
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
        <Clock className="h-2.5 w-2.5" />
        Soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      Closed
    </span>
  );
}

function MediumBadge({ medium }: { medium: Medium }) {
  if (medium === "si") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
        <Languages className="h-2.5 w-2.5" />
        Sinhala
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
      <Globe className="h-2.5 w-2.5" />
      English
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Create / edit modal                                               */
/* ------------------------------------------------------------------ */

function QuizModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: QuizRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => {
    if (!initial) return emptyDraft;
    return {
      title: initial.title,
      description: initial.description ?? "",
      scheduled_at: toLocalInput(initial.scheduled_at),
      duration_minutes: initial.duration_minutes,
      is_published: initial.is_published,
      medium: initial.medium ?? "si",
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!draft.title.trim()) return setError("Title is required.");
    if (!draft.scheduled_at) return setError("Start time is required.");
    if (draft.duration_minutes < 5 || draft.duration_minutes > 300)
      return setError("Duration must be between 5 and 300 minutes.");

    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      scheduled_at: new Date(draft.scheduled_at).toISOString(),
      duration_minutes: draft.duration_minutes,
      is_published: draft.is_published,
      medium: draft.medium,
    };

    setSaving(true);
    const { error: err } = initial
      ? await supabase.from("quizzes").update(payload).eq("id", initial.id)
      : await supabase.from("quizzes").insert(payload);
    setSaving(false);

    if (err) return setError(err.message);
    onSaved();
  }

  const inputBase =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:my-8">
        {/* ============ Header ============ */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                initial
                  ? "bg-amber-50 text-amber-600"
                  : "bg-sky-50 text-sky-600"
              }`}
            >
              {initial ? (
                <Pencil className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                {initial ? "Edit quiz" : "New quiz"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {initial
                  ? "Update the schedule and settings"
                  : "Schedule a new exam session"}
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

        {/* ============ Body ============ */}
        <div className="space-y-4 px-4 py-5 sm:px-5">
          {/* Medium selector */}
          <div>
            <Label label="Medium" hint="Required" />
            <div className="grid grid-cols-2 gap-2">
              <MediumOption
                active={draft.medium === "si"}
                onClick={() => setDraft({ ...draft, medium: "si" })}
                emoji="🇱🇰"
                title="Sinhala"
                subtitle="සිංහල මාධ්‍යය"
              />
              <MediumOption
                active={draft.medium === "en"}
                onClick={() => setDraft({ ...draft, medium: "en" })}
                emoji="🌐"
                title="English"
                subtitle="English medium"
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              {draft.medium === "si"
                ? "Only Sinhala-medium students will see this quiz."
                : "Only English-medium students will see this quiz."}
            </p>
          </div>

          {/* Title */}
          <div>
            <Label label="Title" hint="Required" />
            <input
              className={inputBase}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Quiz 01 — Physics"
            />
          </div>

          {/* Description */}
          <div>
            <Label label="Description" hint="Optional" />
            <textarea
              rows={2}
              className={`${inputBase} resize-y`}
              placeholder="Short summary for students…"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label label="Start time" hint="Required" />
              <input
                type="datetime-local"
                className={inputBase}
                value={draft.scheduled_at}
                onChange={(e) =>
                  setDraft({ ...draft, scheduled_at: e.target.value })
                }
              />
            </div>
            <div>
              <Label label="Duration" hint="Minutes (5–300)" />
              <input
                type="number"
                min={5}
                max={300}
                className={inputBase}
                value={draft.duration_minutes}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    duration_minutes: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          {/* Publish toggle */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={draft.is_published}
              onChange={(e) =>
                setDraft({ ...draft, is_published: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800">
                Publish now
              </div>
              <div className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Students will see this quiz on their dashboard once published.
              </div>
            </div>
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ============ Footer ============ */}
        <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none sm:flex-none"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : initial ? "Save changes" : "Create quiz"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function Label({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-[13px] font-semibold text-slate-800">{label}</span>
      {hint && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {hint}
        </span>
      )}
    </div>
  );
}

function MediumOption({
  active,
  onClick,
  emoji,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition active:scale-[0.98] ${
        active
          ? "border-sky-500 bg-sky-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span
        className={`text-sm font-bold ${
          active ? "text-sky-700" : "text-slate-700"
        }`}
      >
        {title}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {subtitle}
      </span>
    </button>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400">
        <CalendarClock className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-800">No quizzes yet</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Schedule your first quiz — students will see it once you publish it.
      </p>
      <button
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" /> Create first quiz
      </button>
    </div>
  );
}

/** Convert ISO to "YYYY-MM-DDTHH:MM" for <input type="datetime-local"> */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}