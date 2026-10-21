"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  ImageIcon,
  AlertTriangle,
  Save,
  Library,
  Filter,
  CheckCircle2,
  Languages,
  Globe,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ------------------------------------------------------------------ */
/*  Constants & types                                                 */
/* ------------------------------------------------------------------ */

const TOPICS = ["Biology", "Chemistry", "Physics", "General"] as const;
type Topic = (typeof TOPICS)[number];

interface QuestionRow {
  id: string;
  topic: string;
  question_text_si: string;
  question_text_en: string | null;
  option_1_si: string;
  option_2_si: string;
  option_3_si: string;
  option_4_si: string;
  option_5_si: string | null;
  option_1_en: string | null;
  option_2_en: string | null;
  option_3_en: string | null;
  option_4_en: string | null;
  option_5_en: string | null;
  correct_option: number;
  explanation_si: string | null;
  explanation_en: string | null;
  image_url: string | null;
  created_at: string;
}

type Draft = Omit<QuestionRow, "id" | "created_at">;

const emptyDraft: Draft = {
  topic: "General",
  question_text_si: "",
  question_text_en: "",
  option_1_si: "",
  option_2_si: "",
  option_3_si: "",
  option_4_si: "",
  option_5_si: "",
  option_1_en: "",
  option_2_en: "",
  option_3_en: "",
  option_4_en: "",
  option_5_en: "",
  correct_option: 1,
  explanation_si: "",
  explanation_en: "",
  image_url: null,
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function QuestionsPage() {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<Topic | "all">("all");

  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<QuestionRow | null>(null);

  function fetchQuestions() {
    return supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });
  }

  async function load() {
    const { data, error: dbErr } = await fetchQuestions();
    setError(null);
    if (dbErr) setError(dbErr.message);
    setRows((data ?? []) as QuestionRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    fetchQuestions().then(({ data, error: dbErr }) => {
      if (!active) return;
      setError(dbErr?.message ?? null);
      setRows((data ?? []) as QuestionRow[]);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (topicFilter !== "all" && r.topic !== topicFilter) return false;
      if (!q) return true;
      return (
        r.question_text_si.toLowerCase().includes(q) ||
        (r.question_text_en ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, topicFilter]);

  async function handleDelete() {
    if (!deleting) return;
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", deleting.id);
    if (!error) {
      setRows((r) => r.filter((x) => x.id !== deleting.id));
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ============ Header ============ */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600">
            <Library className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Question Bank
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {rows.length} question{rows.length !== 1 ? "s" : ""} in the bank
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreating(true)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] sm:w-auto sm:py-2.5"
        >
          <Plus className="h-4 w-4" /> New question
        </button>
      </header>

      {/* ============ Filters ============ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:py-2.5"
            placeholder="Search questions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="relative sm:w-52">
          <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-9 text-sm text-slate-900 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:py-2.5"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value as Topic | "all")}
          >
            <option value="all">All topics</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            ▾
          </span>
        </div>
      </div>

      {/* ============ List ============ */}
      <div className="mt-5">
        {loading ? (
          <div className="grid place-items-center py-16">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
              <span className="text-sm">Loading questions…</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-semibold text-slate-900">
              Failed to load questions
            </h3>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasRows={rows.length > 0} onCreate={() => setCreating(true)} />
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <QuestionCard
                key={r.id}
                q={r}
                onEdit={() => setEditing(r)}
                onDelete={() => setDeleting(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============ Create/Edit modal ============ */}
      {(creating || editing) && (
        <QuestionModal
          initial={editing ?? emptyDraft}
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
            Delete this question?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            This removes the question from the bank and detaches it from every
            quiz. This can&apos;t be undone.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              onClick={() => setDeleting(null)}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] sm:py-2.5"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-red-500/25 transition hover:bg-red-700 active:scale-[0.98] sm:py-2.5"
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
/*  Question card                                                     */
/* ------------------------------------------------------------------ */

function QuestionCard({
  q,
  onEdit,
  onDelete,
}: {
  q: QuestionRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const options = [
    q.option_1_si,
    q.option_2_si,
    q.option_3_si,
    q.option_4_si,
    q.option_5_si,
  ].filter((x): x is string => !!x);

  const hasEn = !!(q.question_text_en && q.question_text_en.trim());

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md hover:shadow-sky-100/60 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
              {q.topic}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {options.length} options
            </span>
            {hasEn && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                <Globe className="h-2.5 w-2.5" />
                EN
              </span>
            )}
            {q.image_url && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                <ImageIcon className="h-2.5 w-2.5" />
                Image
              </span>
            )}
          </div>

          {/* Question text */}
          <p className="line-clamp-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-900">
            {q.question_text_si}
          </p>
          {hasEn && (
            <p className="mt-1 line-clamp-1 text-xs italic leading-relaxed text-slate-500">
              {q.question_text_en}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-sky-50 hover:text-sky-600 active:scale-95 sm:h-9 sm:w-9"
            title="Edit"
            aria-label="Edit question"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 active:scale-95 sm:h-9 sm:w-9"
            title="Delete"
            aria-label="Delete question"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add / edit modal                                                  */
/* ------------------------------------------------------------------ */

function QuestionModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Draft | QuestionRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = "id" in initial;
  const [draft, setDraft] = useState<Draft>(() => {
    if ("id" in initial) {
      const { id: _id, created_at: _c, ...rest } = initial;
      void _id;
      void _c;
      return rest;
    }
    return initial;
  });
  const [optionCount, setOptionCount] = useState<4 | 5>(
    initial.option_5_si ? 5 : 4
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  /* ---------- Image upload ---------- */

  async function uploadImage(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }
    setUploading(true);
    setError(null);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("question-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("question-images").getPublicUrl(path);
    set("image_url", publicUrl);
    setUploading(false);
  }

  /* ---------- Save ---------- */

  async function save() {
    setError(null);

    if (!draft.question_text_si.trim())
      return setError("Sinhala question text is required.");
    if (
      !draft.option_1_si.trim() ||
      !draft.option_2_si.trim() ||
      !draft.option_3_si.trim() ||
      !draft.option_4_si.trim()
    )
      return setError("At least 4 options are required.");
    if (draft.correct_option < 1 || draft.correct_option > optionCount)
      return setError("Please mark the correct option.");

    // Blank out option 5 if 4-option mode
    const payload: Draft = { ...draft };
    if (optionCount === 4) {
      payload.option_5_si = null;
      payload.option_5_en = null;
      if (payload.correct_option === 5) payload.correct_option = 1;
    }

    // Convert "" to null for optional EN fields
    const optionalFields: (
      | "question_text_en"
      | "option_5_si"
      | "option_1_en"
      | "option_2_en"
      | "option_3_en"
      | "option_4_en"
      | "option_5_en"
      | "explanation_si"
      | "explanation_en"
      | "image_url"
    )[] = [
      "question_text_en",
      "option_5_si",
      "option_1_en",
      "option_2_en",
      "option_3_en",
      "option_4_en",
      "option_5_en",
      "explanation_si",
      "explanation_en",
      "image_url",
    ];
    for (const k of optionalFields) {
      if (
        typeof payload[k] === "string" &&
        payload[k].trim() === ""
      ) {
        payload[k] = null;
      }
    }

    setSaving(true);
    const { error: err } = isEdit
      ? await supabase
          .from("questions")
          .update(payload)
          .eq("id", (initial as QuestionRow).id)
      : await supabase.from("questions").insert(payload);
    setSaving(false);

    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  }

  const inputBase =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:my-8">
        {/* ============ Header ============ */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                isEdit
                  ? "bg-amber-50 text-amber-600"
                  : "bg-sky-50 text-sky-600"
              }`}
            >
              {isEdit ? (
                <Pencil className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                {isEdit ? "Edit question" : "New question"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isEdit
                  ? "Update the details and save your changes"
                  : "Sinhala is required — English is optional"}
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
        <div className="max-h-[68vh] space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
          {/* Topic */}
          <div>
            <Label label="Topic" hint="Required" />
            <select
              className={`${inputBase} appearance-none pr-9`}
              value={draft.topic}
              onChange={(e) => set("topic", e.target.value)}
            >
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Sinhala section */}
          <Section
            icon={<Languages className="h-4 w-4" />}
            title="Sinhala"
            subtitle="Primary"
            accent="sky"
          >
            <div>
              <Label label="Question" hint="Required" />
              <textarea
                rows={3}
                className={`${inputBase} resize-y leading-relaxed`}
                placeholder="ප්‍රශ්නය මෙහි ලියන්න…"
                value={draft.question_text_si}
                onChange={(e) => set("question_text_si", e.target.value)}
              />
            </div>

            <div className="mt-4">
              <Label
                label="Options"
                hint={`${optionCount} · tap the number to mark correct`}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {[1, 2, 3, 4, 5].map((n) => {
                  if (n === 5 && optionCount === 4) return null;
                  const key = `option_${n}_si` as
                    | "option_1_si"
                    | "option_2_si"
                    | "option_3_si"
                    | "option_4_si"
                    | "option_5_si";
                  const isCorrect = draft.correct_option === n;
                  return (
                    <div
                      key={n}
                      className={`flex items-stretch gap-2 rounded-lg border p-1 transition ${
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-transparent"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => set("correct_option", n)}
                        className={`grid h-10 w-10 shrink-0 place-items-center self-center rounded-lg text-xs font-bold transition ${
                          isCorrect
                            ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title={isCorrect ? "Marked as correct" : "Mark as correct"}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          n
                        )}
                      </button>
                      <input
                        type="text"
                        className="w-full rounded-md border-0 bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        placeholder={`Option ${n}`}
                        value={(draft[key] as string) ?? ""}
                        onChange={(e) => set(key, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Toggle + correct summary */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setOptionCount(optionCount === 4 ? 5 : 4)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  {optionCount === 4 ? (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Add 5th option
                    </>
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5" /> Remove 5th option
                    </>
                  )}
                </button>

                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  Correct:
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                    #{draft.correct_option}
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-4">
              <Label label="Explanation" hint="Optional" />
              <textarea
                rows={2}
                className={`${inputBase} resize-y`}
                placeholder="Shown on the review page…"
                value={draft.explanation_si ?? ""}
                onChange={(e) => set("explanation_si", e.target.value)}
              />
            </div>
          </Section>

          {/* English section */}
          <Section
            icon={<Globe className="h-4 w-4" />}
            title="English"
            subtitle="Optional"
            accent="slate"
          >
            <div>
              <Label label="Question" hint="Optional" />
              <textarea
                rows={2}
                className={`${inputBase} resize-y leading-relaxed`}
                placeholder="Write the English translation here…"
                value={draft.question_text_en ?? ""}
                onChange={(e) => set("question_text_en", e.target.value)}
              />
            </div>

            <div className="mt-4">
              <Label label="Options" hint="Optional" />
              <div className="grid gap-2 sm:grid-cols-2">
                {[1, 2, 3, 4, 5].map((n) => {
                  if (n === 5 && optionCount === 4) return null;
                  const key = `option_${n}_en` as keyof Draft;
                  return (
                    <div
                      key={n}
                      className="flex items-stretch gap-2 rounded-lg border border-transparent p-1"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center self-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                        {n}
                      </span>
                      <input
                        type="text"
                        className="w-full rounded-md border-0 bg-transparent px-2 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        placeholder={`Option ${n}`}
                        value={(draft[key] as string) ?? ""}
                        onChange={(e) => set(key, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <Label label="Explanation" hint="Optional" />
              <textarea
                rows={2}
                className={`${inputBase} resize-y`}
                placeholder="Explanation shown on the review page…"
                value={draft.explanation_en ?? ""}
                onChange={(e) => set("explanation_en", e.target.value)}
              />
            </div>
          </Section>

          {/* Image */}
          <Section
            icon={<ImageIcon className="h-4 w-4" />}
            title="Diagram"
            subtitle="Optional"
            accent="slate"
          >
            {draft.image_url ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draft.image_url}
                    alt="Preview"
                    className="max-h-40 w-auto rounded-xl border border-slate-200 object-contain"
                  />
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => set("image_url", null)}
                  className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploading ? "Uploading…" : "Choose file"}
                </button>
                <span className="text-xs text-slate-500">
                  PNG, JPG · max 5MB
                </span>
              </div>
            )}
          </Section>

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
            {saving
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create question"}
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

function Section({
  icon,
  title,
  subtitle,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: "sky" | "slate";
  children: React.ReactNode;
}) {
  const accentChip =
    accent === "sky" ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-500";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${accentChip}`}
        >
          {icon}
        </span>
        <div className="flex flex-1 items-baseline justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {subtitle}
          </span>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  hasRows,
  onCreate,
}: {
  hasRows: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400">
        {hasRows ? <Search className="h-6 w-6" /> : <Library className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 font-semibold text-slate-800">
        {hasRows ? "No matches found" : "No questions yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {hasRows
          ? "Try a different search term or topic filter."
          : "Add your first question to start building the bank."}
      </p>
      {!hasRows && (
        <button
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] sm:py-2.5"
        >
          <Plus className="h-4 w-4" /> Add first question
        </button>
      )}
    </div>
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