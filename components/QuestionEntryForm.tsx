"use client";

import { CheckCircle2, Plus, Minus, Languages, BookOpen, Globe, Hash } from "lucide-react";
import ImageUploadField from "./ImageUploadField";

/* ------------------------------------------------------------------ */
/*  Shared types & constants (UNCHANGED exports)                      */
/* ------------------------------------------------------------------ */

export const QUESTION_TOPICS = ["Biology", "Chemistry", "Physics", "General"] as const;
export type QuestionTopic = (typeof QUESTION_TOPICS)[number];

export interface QuestionDraft {
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
}

export interface QuestionRow extends QuestionDraft {
  id: string;
  created_at: string;
}

export const EMPTY_QUESTION_DRAFT: QuestionDraft = {
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
/*  Form                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  draft: QuestionDraft;
  onChange: (d: QuestionDraft) => void;
  optionCount: 4 | 5;
  onOptionCountChange: (n: 4 | 5) => void;
  disabled?: boolean;
}

export default function QuestionEntryForm({
  draft,
  onChange,
  optionCount,
  onOptionCountChange,
  disabled = false,
}: Props) {
  function set<K extends keyof QuestionDraft>(key: K, value: QuestionDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  /* ------------------------------------------------------------------ */
  /*  Shared input class — used everywhere for consistency              */
  /* ------------------------------------------------------------------ */
  const inputBase =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ============ Topic ============ */}
      <div>
        <FieldLabel label="Topic" hint="Required" />
        <div className="relative">
          <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            className={`${inputBase} appearance-none pl-9 pr-9`}
            value={draft.topic}
            disabled={disabled}
            onChange={(e) => set("topic", e.target.value)}
          >
            {QUESTION_TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            ▾
          </span>
        </div>
      </div>

      {/* ============ Sinhala (primary) ============ */}
      <Section
        icon={<Languages className="h-4 w-4" />}
        title="Sinhala"
        subtitle="Primary"
        accent="sky"
      >
        {/* Question text */}
        <div>
          <FieldLabel label="Question" hint="Required" />
          <textarea
            rows={3}
            className={`${inputBase} resize-y leading-relaxed`}
            placeholder="ප්‍රශ්නය මෙහි ලියන්න…"
            disabled={disabled}
            value={draft.question_text_si}
            onChange={(e) => set("question_text_si", e.target.value)}
          />
        </div>

        {/* Options */}
        <div className="mt-4">
          <FieldLabel
            label="Options"
            hint={`${optionCount} · tap the number to mark correct`}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4, 5].map((n) => {
              if (n === 5 && optionCount === 4) return null;
              const key = `option_${n}_si` as keyof QuestionDraft;
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
                    disabled={disabled}
                    onClick={() => set("correct_option", n)}
                    className={`grid h-10 w-10 shrink-0 place-items-center self-center rounded-lg text-xs font-bold transition ${
                      isCorrect
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    title={isCorrect ? "Marked as correct" : "Mark as correct"}
                  >
                    {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : n}
                  </button>
                  <input
                    type="text"
                    className={`${inputBase} border-0 bg-transparent focus:ring-0`}
                    disabled={disabled}
                    placeholder={`Option ${n}`}
                    value={(draft[key] as string) ?? ""}
                    onChange={(e) => set(key, e.target.value as never)}
                  />
                </div>
              );
            })}
          </div>

          {/* Option-count toggle + correct marker summary */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const next = optionCount === 4 ? 5 : 4;
                onOptionCountChange(next);
                if (next === 4 && draft.correct_option === 5) set("correct_option", 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50"
            >
              {optionCount === 4 ? (
                <>
                  <Plus className="h-3.5 w-3.5" /> Add 5th option
                </>
              ) : (
                <>
                  <Minus className="h-3.5 w-3.5" /> Remove 5th option
                </>
              )}
            </button>

            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <span className="text-slate-400">Correct answer:</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                <Hash className="h-3 w-3" />
                {draft.correct_option}
              </span>
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-4">
          <FieldLabel label="Explanation" hint="Optional" />
          <textarea
            rows={2}
            className={`${inputBase} resize-y`}
            placeholder="Review මුහුණතේ පෙන්වන පැහැදිලි කිරීම…"
            disabled={disabled}
            value={draft.explanation_si ?? ""}
            onChange={(e) => set("explanation_si", e.target.value)}
          />
        </div>
      </Section>

      {/* ============ English (optional) ============ */}
      <Section
        icon={<Globe className="h-4 w-4" />}
        title="English"
        subtitle="Optional"
        accent="slate"
      >
        <div>
          <FieldLabel label="Question" hint="Optional" />
          <textarea
            rows={2}
            className={`${inputBase} resize-y leading-relaxed`}
            placeholder="Write the English translation here…"
            disabled={disabled}
            value={draft.question_text_en ?? ""}
            onChange={(e) => set("question_text_en", e.target.value)}
          />
        </div>

        <div className="mt-4">
          <FieldLabel label="Options" hint="Optional" />
          <div className="grid gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4, 5].map((n) => {
              if (n === 5 && optionCount === 4) return null;
              const key = `option_${n}_en` as keyof QuestionDraft;
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
                    className={`${inputBase} border-0 bg-transparent focus:ring-0`}
                    disabled={disabled}
                    placeholder={`Option ${n}`}
                    value={(draft[key] as string) ?? ""}
                    onChange={(e) => set(key, e.target.value as never)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <FieldLabel label="Explanation" hint="Optional" />
          <textarea
            rows={2}
            className={`${inputBase} resize-y`}
            placeholder="Explanation shown on the review page…"
            disabled={disabled}
            value={draft.explanation_en ?? ""}
            onChange={(e) => set("explanation_en", e.target.value)}
          />
        </div>
      </Section>

      {/* ============ Image ============ */}
      <ImageUploadField
        value={draft.image_url}
        onChange={(url) => set("image_url", url)}
        label="Diagram"
        sublabel="Optional"
        disabled={disabled}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
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
    accent === "sky"
      ? "bg-sky-50 text-sky-600"
      : "bg-slate-100 text-slate-500";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${accentChip}`}>
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