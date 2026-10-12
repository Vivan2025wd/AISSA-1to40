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
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const TOPICS = ["Biology", "Chemistry", "Physics", "General"] as const;
type Topic = (typeof TOPICS)[number];

interface QuestionRow {
  id: string;
  topic: string;
  question_text_si: string;
  question_text_en: string | null;
  option_1_si: string; option_2_si: string; option_3_si: string;
  option_4_si: string; option_5_si: string | null;
  option_1_en: string | null; option_2_en: string | null; option_3_en: string | null;
  option_4_en: string | null; option_5_en: string | null;
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
  option_1_si: "", option_2_si: "", option_3_si: "", option_4_si: "", option_5_si: "",
  option_1_en: "", option_2_en: "", option_3_en: "", option_4_en: "", option_5_en: "",
  correct_option: 1,
  explanation_si: "",
  explanation_en: "",
  image_url: null,
};

export default function QuestionsPage() {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<Topic | "all">("all");

  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<QuestionRow | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as QuestionRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

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
    const { error } = await supabase.from("questions").delete().eq("id", deleting.id);
    if (!error) {
      setRows((r) => r.filter((x) => x.id !== deleting.id));
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">ප්‍රශ්න බැංකුව</h1>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length} ප්‍රශ්න · Question Bank
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> නව ප්‍රශ්නය
        </button>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="ප්‍රශ්න සොයන්න..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value as any)}
        >
          <option value="all">සියලු විෂය</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="mt-5">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <p className="text-sm text-slate-600">
              {rows.length === 0 ? "තවම ප්‍රශ්න නොමැත." : "ගැලපෙන ප්‍රශ්න නොමැත."}
            </p>
          </div>
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

      {/* Create/Edit modal */}
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

      {/* Delete confirmation */}
      {deleting && (
        <Modal onClose={() => setDeleting(null)}>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">මකන්නද?</h2>
          <p className="mt-1 text-sm text-slate-600">
            මෙම ප්‍රශ්නය සහ එයට සම්බන්ධ සියලු දත්ත මකා දැමේ. ප්‍රතිවර්තනය කළ නොහැක.
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

/* ---------------- Question card ---------------- */

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
    q.option_1_si, q.option_2_si, q.option_3_si, q.option_4_si, q.option_5_si,
  ].filter((x): x is string => !!x);

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="badge bg-brand-50 text-brand-700">{q.topic}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
              {options.length} options
            </span>
            {q.image_url && (
              <span className="badge bg-slate-100 text-slate-600">
                <ImageIcon className="h-3 w-3" /> Image
              </span>
            )}
          </div>
          <p className="line-clamp-2 whitespace-pre-wrap text-sm font-medium text-slate-900">
            {q.question_text_si}
          </p>
          {q.question_text_en && (
            <p className="mt-1 line-clamp-1 text-xs text-slate-500 italic">
              {q.question_text_en}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
    </div>
  );
}

/* ---------------- Add/Edit modal ---------------- */

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
    const { id: _id, created_at: _c, ...rest } = initial as any;
    return rest as Draft;
  });
  const [optionCount, setOptionCount] = useState<4 | 5>(
    (initial as any).option_5_si ? 5 : 4
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function uploadImage(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("රූපය 5MB ට වඩා කුඩා විය යුතුය.");
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
    const { data: { publicUrl } } = supabase.storage
      .from("question-images")
      .getPublicUrl(path);
    set("image_url", publicUrl);
    setUploading(false);
  }

  async function save() {
    setError(null);

    if (!draft.question_text_si.trim()) return setError("සිංහල ප්‍රශ්න පෙළ අවශ්‍යයි.");
    if (!draft.option_1_si.trim() || !draft.option_2_si.trim() ||
        !draft.option_3_si.trim() || !draft.option_4_si.trim())
      return setError("අවම වශයෙන් විකල්ප 4ක් අවශ්‍යයි.");
    if (draft.correct_option < 1 || draft.correct_option > optionCount)
      return setError("නිවැරදි පිළිතුර තෝරන්න.");

    // Blank out option 5 if 4-option mode
    const payload: any = { ...draft };
    if (optionCount === 4) {
      payload.option_5_si = null;
      payload.option_5_en = null;
      if (payload.correct_option === 5) payload.correct_option = 1;
    }

    // Convert "" to null for optional EN fields
    for (const k of Object.keys(payload)) {
      if (typeof payload[k] === "string" && payload[k].trim() === "" && k !== "question_text_si") {
        payload[k] = null;
      }
    }

    setSaving(true);
    const { error: err } = isEdit
      ? await supabase.from("questions").update(payload).eq("id", (initial as QuestionRow).id)
      : await supabase.from("questions").insert(payload);
    setSaving(false);

    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4">
      <div className="mx-auto my-8 w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? "ප්‍රශ්නය සංස්කරණය" : "නව ප්‍රශ්නය"}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
          {/* Topic */}
          <div>
            <Label si="විෂය" en="Topic" />
            <select
              className="input"
              value={draft.topic}
              onChange={(e) => set("topic", e.target.value)}
            >
              {TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Sinhala */}
          <Section title="සිංහල" subtitle="Sinhala (primary)">
            <div>
              <Label si="ප්‍රශ්නය" en="Question" />
              <textarea
                rows={3}
                className="input"
                value={draft.question_text_si}
                onChange={(e) => set("question_text_si", e.target.value)}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4, 5].map((n) => {
                if (n === 5 && optionCount === 4) return null;
                const key = `option_${n}_si` as keyof Draft;
                return (
                  <div key={n} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => set("correct_option", n)}
                      className={`mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                        draft.correct_option === n
                          ? "bg-green-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      title="Mark as correct"
                    >
                      {n}
                    </button>
                    <input
                      type="text"
                      className="input"
                      placeholder={`විකල්පය ${n}`}
                      value={(draft[key] as string) ?? ""}
                      onChange={(e) => set(key, e.target.value as any)}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setOptionCount(optionCount === 4 ? 5 : 4)}
                className="text-brand-600 hover:underline"
              >
                {optionCount === 4 ? "+ 5වන විකල්පය එක් කරන්න" : "− 5වන විකල්පය ඉවත් කරන්න"}
              </button>
              <span className="text-slate-500">
                නිවැරදි පිළිතුර: <strong>{draft.correct_option}</strong>
              </span>
            </div>
            <div className="mt-3">
              <Label si="පැහැදිලි කිරීම (අවශ්‍ය නම්)" en="Explanation" />
              <textarea
                rows={2}
                className="input"
                value={draft.explanation_si ?? ""}
                onChange={(e) => set("explanation_si", e.target.value)}
              />
            </div>
          </Section>

          {/* English */}
          <Section title="English" subtitle="Optional">
            <div>
              <Label si="Question" en="" />
              <textarea
                rows={2}
                className="input"
                value={draft.question_text_en ?? ""}
                onChange={(e) => set("question_text_en", e.target.value)}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4, 5].map((n) => {
                if (n === 5 && optionCount === 4) return null;
                const key = `option_${n}_en` as keyof Draft;
                return (
                  <input
                    key={n}
                    type="text"
                    className="input"
                    placeholder={`Option ${n}`}
                    value={(draft[key] as string) ?? ""}
                    onChange={(e) => set(key, e.target.value as any)}
                  />
                );
              })}
            </div>
            <div className="mt-3">
              <Label si="Explanation" en="" />
              <textarea
                rows={2}
                className="input"
                value={draft.explanation_en ?? ""}
                onChange={(e) => set("explanation_en", e.target.value)}
              />
            </div>
          </Section>

          {/* Image */}
          <Section title="රූපය" subtitle="Diagram (optional)">
            {draft.image_url ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.image_url}
                  alt="Preview"
                  className="max-h-40 rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => set("image_url", null)}
                  className="btn-outline text-xs"
                >
                  <X className="h-3.5 w-3.5" /> ඉවත් කරන්න
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
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
                  className="btn-outline"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? "උඩුගත වෙමින්..." : "රූපය උඩුගත කරන්න"}
                </button>
                <span className="text-xs text-slate-500">PNG, JPG · max 5MB</span>
              </div>
            )}
          </Section>

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
            {saving ? "සුරකිමින්..." : "සුරකින්න"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- small bits ---------------- */

function Label({ si, en }: { si: string; en: string }) {
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