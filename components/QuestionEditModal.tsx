"use client";

import { useState } from "react";
import { Loader2, X, Save, Trash2, AlertTriangle, Pencil, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import QuestionEntryForm, {
  EMPTY_QUESTION_DRAFT,
  type QuestionDraft,
  type QuestionRow,
} from "./QuestionEntryForm";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Props {
  /** null → create new; QuestionRow → edit existing */
  initial: QuestionRow | null;
  onClose: () => void;
  onSaved: (saved: QuestionRow) => void;
  /** When provided, a delete button is shown in edit mode */
  onDeleted?: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function QuestionEditModal({
  initial,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = !!initial;

  const [draft, setDraft] = useState<QuestionDraft>(() => {
    if (!initial) return EMPTY_QUESTION_DRAFT;
    const { id: _id, created_at: _c, ...rest } = initial;
    return rest;
  });

  const [optionCount, setOptionCount] = useState<4 | 5>(
    initial?.option_5_si ? 5 : 4
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* ---------- Validation ---------- */

  function validate(): string | null {
    if (!draft.question_text_si.trim())
      return "Sinhala question text is required.";
    if (
      !draft.option_1_si.trim() ||
      !draft.option_2_si.trim() ||
      !draft.option_3_si.trim() ||
      !draft.option_4_si.trim()
    )
      return "At least 4 options are required.";
    if (draft.correct_option < 1 || draft.correct_option > optionCount)
      return "Please mark the correct option.";
    return null;
  }

  /* ---------- Save ---------- */

  async function save() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);

    const payload: Record<string, unknown> = { ...draft };

    // Null out option 5 when 4-option mode
    if (optionCount === 4) {
      payload.option_5_si = null;
      payload.option_5_en = null;
      if (payload.correct_option === 5) payload.correct_option = 1;
    }

    // Convert empty optional strings to null
    const keepStringKeys = new Set([
      "topic",
      "question_text_si",
      "option_1_si",
      "option_2_si",
      "option_3_si",
      "option_4_si",
    ]);
    for (const k of Object.keys(payload)) {
      if (keepStringKeys.has(k)) continue;
      if (k === "correct_option") continue;
      const v = payload[k];
      if (typeof v === "string" && v.trim() === "") payload[k] = null;
    }

    const q = isEdit
      ? supabase
          .from("questions")
          .update(payload)
          .eq("id", initial!.id)
          .select()
          .single()
      : supabase.from("questions").insert(payload).select().single();

    const { data, error: dbErr } = await q;
    setSaving(false);

    if (dbErr) {
      setError(dbErr.message);
      return;
    }

    onSaved(data as QuestionRow);
  }

  /* ---------- Delete ---------- */

  async function handleDelete() {
    if (!initial) return;
    setDeleting(true);
    const { error: dbErr } = await supabase
      .from("questions")
      .delete()
      .eq("id", initial.id);
    setDeleting(false);

    if (dbErr) {
      setError(dbErr.message);
      setConfirmDelete(false);
      return;
    }
    onDeleted?.(initial.id);
  }

  /* ---------- Render ---------- */

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-4">
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
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                {isEdit ? "Edit question" : "New question"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isEdit
                  ? "Update the details and save your changes"
                  : "Fill in both languages — Sinhala is required"}
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
        <div className="max-h-[68vh] overflow-y-auto px-4 py-5 sm:px-5">
          <QuestionEntryForm
            draft={draft}
            onChange={setDraft}
            optionCount={optionCount}
            onOptionCountChange={setOptionCount}
            disabled={saving || deleting}
          />

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ============ Footer ============ */}
        <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {/* Left: delete controls */}
          <div className="flex items-center justify-center sm:justify-start">
            {isEdit && onDeleted && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
            {confirmDelete && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/70 px-2.5 py-1.5">
                <span className="text-xs font-medium text-red-700">
                  Delete this question?
                </span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  No
                </button>
              </div>
            )}
          </div>

          {/* Right: primary actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none sm:flex-none"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create question"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}