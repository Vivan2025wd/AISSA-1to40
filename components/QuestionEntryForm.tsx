"use client";

import { CheckCircle2, Plus, Minus } from "lucide-react";
import ImageUploadField from "./ImageUploadField";

/* ------------------------------------------------------------------ */
/*  Shared types                                                      */
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

  return (
    <div className="space-y-5">
      {/* Topic */}
      <div>
        <FieldLabel si="විෂය" en="Topic" />
        <select
          className="input"
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
      </div>

      {/* Sinhala */}
      <Section title="සිංහල" subtitle="Sinhala (primary)">
        <div>
          <FieldLabel si="ප්‍රශ්නය" en="Question" />
          <textarea
            rows={3}
            className="input"
            disabled={disabled}
            value={draft.question_text_si}
            onChange={(e) => set("question_text_si", e.target.value)}
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4, 5].map((n) => {
            if (n === 5 && optionCount === 4) return null;
            const key = `option_${n}_si` as keyof QuestionDraft;
            const isCorrect = draft.correct_option === n;
            return (
              <div key={n} className="flex items-start gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => set("correct_option", n)}
                  className={`mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                    isCorrect
                      ? "bg-green-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  title="Mark as correct"
                >
                  {isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
                </button>
                <input
                  type="text"
                  className="input"
                  disabled={disabled}
                  placeholder={`විකල්පය ${n}`}
                  value={(draft[key] as string) ?? ""}
                  onChange={(e) => set(key, e.target.value as never)}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const next = optionCount === 4 ? 5 : 4;
              onOptionCountChange(next);
              if (next === 4 && draft.correct_option === 5) set("correct_option", 1);
            }}
            className="inline-flex items-center gap-1 text-brand-600 hover:underline"
          >
            {optionCount === 4 ? (
              <>
                <Plus className="h-3.5 w-3.5" /> 5වන විකල්පය එක් කරන්න
              </>
            ) : (
              <>
                <Minus className="h-3.5 w-3.5" /> 5වන විකල්පය ඉවත් කරන්න
              </>
            )}
          </button>
          <span className="text-slate-500">
            නිවැරදි පිළිතුර: <strong className="text-slate-800">{draft.correct_option}</strong>
          </span>
        </div>

        <div className="mt-3">
          <FieldLabel si="පැහැදිලි කිරීම (අවශ්‍ය නම්)" en="Explanation" />
          <textarea
            rows={2}
            className="input"
            disabled={disabled}
            value={draft.explanation_si ?? ""}
            onChange={(e) => set("explanation_si", e.target.value)}
          />
        </div>
      </Section>

      {/* English */}
      <Section title="English" subtitle="Optional">
        <div>
          <FieldLabel si="Question" en="" />
          <textarea
            rows={2}
            className="input"
            disabled={disabled}
            value={draft.question_text_en ?? ""}
            onChange={(e) => set("question_text_en", e.target.value)}
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4, 5].map((n) => {
            if (n === 5 && optionCount === 4) return null;
            const key = `option_${n}_en` as keyof QuestionDraft;
            return (
              <input
                key={n}
                type="text"
                className="input"
                disabled={disabled}
                placeholder={`Option ${n}`}
                value={(draft[key] as string) ?? ""}
                onChange={(e) => set(key, e.target.value as never)}
              />
            );
          })}
        </div>

        <div className="mt-3">
          <FieldLabel si="Explanation" en="" />
          <textarea
            rows={2}
            className="input"
            disabled={disabled}
            value={draft.explanation_en ?? ""}
            onChange={(e) => set("explanation_en", e.target.value)}
          />
        </div>
      </Section>

      {/* Image */}
      <ImageUploadField
        value={draft.image_url}
        onChange={(url) => set("image_url", url)}
        disabled={disabled}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function FieldLabel({ si, en }: { si: string; en: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <span className="text-sm font-medium text-slate-800">{si}</span>
      {en && <span className="text-[11px] text-slate-400">{en}</span>}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-semibold text-slate-800">{title}</span>
        <span className="text-xs text-slate-400">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}