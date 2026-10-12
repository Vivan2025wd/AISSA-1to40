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
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getQuizWindow } from "@/lib/quiz-window";

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

export default function QuizzesPage() {
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<QuizRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<QuizRow | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("quizzes")
      .select(
        "id, title, description, scheduled_at, duration_minutes, is_published, medium, created_at"
      )
      .order("scheduled_at", { ascending: false });

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
      rows.map((x) => (x.id === q.id ? { ...x, is_published: !x.is_published } : x))
    );
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", deleting.id);
    if (!error) {
      setRows((r) => r.filter((x) => x.id !== deleting.id));
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">ප්‍රශ්නාවලි</h1>
          <p className="mt-1 text-sm text-slate-600">{rows.length} total · Quiz Scheduler</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> නව ප්‍රශ්නාවලිය
        </button>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="card px-6 py-12 text-center text-sm text-slate-600">
            තවම ප්‍රශ්නාවලි නොමැත.
          </div>
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

      {deleting && (
        <Modal onClose={() => setDeleting(null)}>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">මකන්නද?</h2>
          <p className="mt-1 text-sm text-slate-600">
            ප්‍රශ්නාවලිය සහ සියලු සම්බන්ධතා මකා දැමේ. ප්‍රතිඵල රඳවා ගනු ලැබේ.
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => setDeleting(null)} className="btn-outline flex-1">
              අවලංගු
            </button>
            <button onClick={handleDelete} className="btn-danger flex-1">
              <Trash2 className="h-4 w-4" /> මකන්න
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

  const statusBadge = !quiz.is_published ? (
    <span className="badge bg-slate-100 text-slate-600">කෙටුම්පත</span>
  ) : w.status === "active" ? (
    <span className="badge bg-green-50 text-green-700">සක්‍රීය</span>
  ) : w.status === "upcoming" ? (
    <span className="badge bg-amber-50 text-amber-700">ඉදිරියේ</span>
  ) : (
    <span className="badge bg-slate-100 text-slate-600">අවසන්</span>
  );

  const mediumBadge =
    quiz.medium === "si" ? (
      <span className="badge bg-blue-50 text-blue-700">🇱🇰 සිංහල</span>
    ) : (
      <span className="badge bg-purple-50 text-purple-700">🌐 English</span>
    );

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900">{quiz.title}</h3>
            {statusBadge}
            {mediumBadge}
          </div>
          {quiz.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{quiz.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <CalIcon className="h-3.5 w-3.5" />
              {new Date(quiz.scheduled_at).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {quiz.duration_minutes} min
            </span>
            <span className="flex items-center gap-1">
              <Library className="h-3.5 w-3.5" /> {qCount} / 20 ප්‍රශ්න
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
          <button
            onClick={onTogglePublish}
            className={`grid h-8 w-8 place-items-center rounded-lg transition ${
              quiz.is_published
                ? "text-green-600 hover:bg-green-50"
                : "text-slate-400 hover:bg-slate-100"
            }`}
            title={quiz.is_published ? "Unpublish" : "Publish"}
          >
            {quiz.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <Link
          href={`/admin/quizzes/${quiz.id}/questions`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
        >
          ප්‍රශ්න කළමනාකරණය <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
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
    if (!draft.title.trim()) return setError("මාතෘකාව අවශ්‍යයි.");
    if (!draft.scheduled_at) return setError("ආරම්භක වේලාව අවශ්‍යයි.");
    if (draft.duration_minutes < 5 || draft.duration_minutes > 300)
      return setError("කාලය මිනිත්තු 5–300 අතර විය යුතුය.");

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4">
      <div className="mx-auto my-8 w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {initial ? "සංස්කරණය" : "නව ප්‍රශ්නාවලිය"}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {/* Medium selector */}
          <div>
            <Label si="මාධ්‍යය" en="Medium" />
            <div className="grid grid-cols-2 gap-2">
              <MediumOption
                active={draft.medium === "si"}
                onClick={() => setDraft({ ...draft, medium: "si" })}
                emoji="🇱🇰"
                title="සිංහල"
                subtitle="Sinhala Medium"
              />
              <MediumOption
                active={draft.medium === "en"}
                onClick={() => setDraft({ ...draft, medium: "en" })}
                emoji="🌐"
                title="English"
                subtitle="English Medium"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {draft.medium === "si"
                ? "සිංහල මාධ්‍යයේ ලියාපදිංචි සිසුන්ට පමණක් මෙය දිස්වේ."
                : "Only English-medium students will see this quiz."}
            </p>
          </div>

          <div>
            <Label si="මාතෘකාව" en="Title" />
            <input
              className="input"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="උදා: ප්‍රශ්නාවලිය 01 — භෞතික විද්‍යාව"
            />
          </div>

          <div>
            <Label si="විස්තරය" en="Description (optional)" />
            <textarea
              rows={2}
              className="input"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label si="ආරම්භය" en="Start" />
              <input
                type="datetime-local"
                className="input"
                value={draft.scheduled_at}
                onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value })}
              />
            </div>
            <div>
              <Label si="කාලය" en="Duration (min)" />
              <input
                type="number"
                min={5}
                max={300}
                className="input"
                value={draft.duration_minutes}
                onChange={(e) =>
                  setDraft({ ...draft, duration_minutes: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={draft.is_published}
              onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            ප්‍රකාශයට පත් කරන්න (students will see it)
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} disabled={saving} className="btn-outline">
            අවලංගු
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            සුරකින්න
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function Label({ si, en }: { si: string; en: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <span className="text-sm font-medium text-slate-800">{si}</span>
      {en && <span className="text-[11px] text-slate-400">{en}</span>}
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
      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition ${
        active
          ? "border-brand-500 bg-brand-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span
        className={`text-sm font-bold ${
          active ? "text-brand-700" : "text-slate-700"
        }`}
      >
        {title}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-slate-400">
        {subtitle}
      </span>
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">{children}</div>
      </div>
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