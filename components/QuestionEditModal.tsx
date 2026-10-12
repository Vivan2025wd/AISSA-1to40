"use client";

import { useState } from "react";
import { Loader2, X, Save, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import QuestionEntryForm, {
  EMPTY_QUESTION_DRAFT,
  type QuestionDraft,
  type QuestionRow,
} from "./QuestionEntryForm";

interface Props {
  /** null → create new; QuestionRow → edit existing */
  initial: QuestionRow | null;
  onClose: () => void;
  onSaved: (saved: QuestionRow) => void;
  /** When provided, a delete button is shown in edit mode */
  onDeleted?: (id: string) => void;
}

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

  /* ---------- validation ---------- */

  function validate(): string | null {
    if (!draft.question_text_si.trim()) return "සිංහල ප්‍රශ්න පෙළ අවශ්‍යයි.";
    if (
      !draft.option_1_si.trim() ||
      !draft.option_2_si.trim() ||
      !draft.option_3_si.trim() ||
      !draft.option_4_si.trim()
    )
      return "අවම වශයෙන් විකල්ප 4ක් අවශ්‍යයි.";
    if (draft.correct_option < 1 || draft.correct_option > optionCount)
      return "නිවැරදි පිළිතුර තෝරන්න.";
    return null;
  }

  /* ---------- save ---------- */

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
      ? supabase.from("questions").update(payload).eq("id", initial!.id).select().single()
      : supabase.from("questions").insert(payload).select().single();

    const { data, error: dbErr } = await q;
    setSaving(false);

    if (dbErr) {
      setError(dbErr.message);
      return;
    }

    onSaved(data as QuestionRow);
  }

  /* ---------- delete ---------- */

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4">
      <div className="mx-auto my-8 w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? "ප්‍රශ්නය සංස්කරණය" : "නව ප්‍රශ්නය"}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
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
              {error}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
          <div>
            {isEdit && onDeleted && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
                className="btn-outline text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> මකන්න
              </button>
            )}
            {confirmDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">විශ්වාසද?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-danger text-xs"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  ඔව්
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="btn-outline text-xs"
                >
                  නැත
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="btn-outline">
              අවලංගු
            </button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "සුරකිමින්..." : "සුරකින්න"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}