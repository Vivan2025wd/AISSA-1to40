"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Languages,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Flag,
  Send,
  RefreshCw,
  Library,
  Globe,
} from "lucide-react";
import { formatCountdown, getQuizWindow } from "@/lib/quiz-window";

/* ------------------------------------------------------------------ */
/*  Types (mirror the API route)                                      */
/* ------------------------------------------------------------------ */

interface QuizMeta {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  question_count: number;
  medium?: "si" | "en";
}

interface WindowMeta {
  status: "upcoming" | "active" | "expired";
  remaining_seconds: number;
  start_ms: number;
  end_ms: number;
}

interface ExamQuestion {
  id: string;
  topic: string;
  text_si: string;
  text_en: string | null;
  options_si: (string | null)[];
  options_en: (string | null)[];
  image_url: string | null;
}

interface ReviewQuestion extends ExamQuestion {
  correct_option: number;
  selected_option: number | null;
  is_correct: boolean;
  explanation_si: string | null;
  explanation_en: string | null;
}

interface AttemptMeta {
  result_id: string;
  score: number;
  total: number;
  time_spent_seconds: number;
  submitted_at: string;
}

/** All the reasons the API can return for "unavailable". */
type UnavailableReason =
  | "not_started"
  | "expired"
  | "unpublished"
  | "wrong_medium";

type ApiResponse =
  | { mode: "exam"; quiz: QuizMeta; window: WindowMeta; questions: ExamQuestion[] }
  | { mode: "review"; quiz: QuizMeta; window: WindowMeta; attempt: AttemptMeta; questions: ReviewQuestion[] }
  | {
      mode: "unavailable";
      quiz: QuizMeta;
      window: WindowMeta;
      reason: UnavailableReason;
      attempt?: AttemptMeta | null;
    };

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function QuizPage() {
  const { id: quizId } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"si" | "en">("si");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz/${quizId}`, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    load();
  }, [load]);

  /* Language preference:
     1. If the quiz is for a specific medium, start in that medium.
     2. Otherwise, use the saved preference. */
  useEffect(() => {
    if (!data) return;
    const quizMedium = data.quiz.medium;
    if (quizMedium === "si" || quizMedium === "en") {
      setLang(quizMedium);
      localStorage.setItem("quiz_lang", quizMedium);
      return;
    }
    const saved = localStorage.getItem("quiz_lang");
    if (saved === "si" || saved === "en") setLang(saved);
  }, [data]);

  /* Persist any manual toggle */
  useEffect(() => {
    localStorage.setItem("quiz_lang", lang);
  }, [lang]);

  if (loading) return <CenterSpinner label="ප්‍රශ්නාවලිය පූරණය වෙමින්..." />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!data) return null;

  if (data.mode === "unavailable") {
    return (
      <UnavailableView
        quiz={data.quiz}
        window={data.window}
        reason={data.reason}
      />
    );
  }

  if (data.mode === "review") {
    return (
      <ReviewView
        quiz={data.quiz}
        attempt={data.attempt}
        questions={data.questions}
        lang={lang}
        onToggleLang={setLang}
      />
    );
  }

  return (
    <ExamView
      quiz={data.quiz}
      window={data.window}
      questions={data.questions}
      lang={lang}
      onToggleLang={setLang}
      onSubmitted={() => {
        load();
        router.refresh();
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Exam view — the actual engine                                     */
/* ------------------------------------------------------------------ */

function ExamView({
  quiz,
  window: windowMeta,
  questions,
  lang,
  onToggleLang,
  onSubmitted,
}: {
  quiz: QuizMeta;
  window: WindowMeta;
  questions: ExamQuestion[];
  lang: "si" | "en";
  onToggleLang: (l: "si" | "en") => void;
  onSubmitted: () => void;
}) {
  const storageKey = `quiz_progress_${quiz.id}`;

  const [answers, setAnswers] = useState<Record<string, number | null>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(windowMeta.remaining_seconds);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const startedAtRef = useRef<number>(
    Date.now() - (quiz.duration_minutes * 60 - windowMeta.remaining_seconds) * 1000
  );
  const submittedRef = useRef(false);

  /* Autosave */
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      /* ignore quota */
    }
  }, [answers, storageKey]);

  const submit = useCallback(
    async (auto: boolean) => {
      if (submittedRef.current && !auto) return;
      submittedRef.current = true;
      setSubmitting(true);
      setSubmitError(null);

      const payload = {
        answers: questions.map((q) => ({
          question_id: q.id,
          selected_option: answers[q.id] ?? null,
        })),
        time_spent_seconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
      };

      try {
        const res = await fetch(`/api/quiz/${quiz.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        localStorage.removeItem(storageKey);
        onSubmitted();
      } catch (e: any) {
        setSubmitError(e.message ?? "Submit failed");
        submittedRef.current = false;
        setSubmitting(false);
      }
    },
    [answers, questions, quiz.id, storageKey, onSubmitted]
  );

  /* Countdown */
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next <= 0 && !submittedRef.current) {
          submittedRef.current = true;
          submit(true);
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => v !== null && v !== undefined).length,
    [answers]
  );

  const warningThreshold = 60;

  /* Guard against empty question list */
  if (questions.length === 0) {
    return <EmptyQuestionsView quiz={quiz} />;
  }

  const q = questions[current];

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6">
      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> මුල් පිටුවට
          </Link>
          <h1 className="mt-1 truncate text-lg font-bold text-slate-900">{quiz.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleLang(lang === "si" ? "en" : "si")}
            className="btn-outline px-3 py-2 text-xs"
            title="Toggle language"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "si" ? "English" : "සිංහල"}
          </button>

          <TimerPill remaining={remaining} warning={remaining <= warningThreshold} />
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            පිළිතුරු දී ඇත: <strong className="text-slate-800">{answeredCount}</strong> /{" "}
            {questions.length}
          </span>
          <span>
            ප්‍රශ්නය {current + 1} / {questions.length}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        {/* Question card */}
        <div className="card p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="badge bg-brand-50 text-brand-700">{q.topic}</span>
            <span className="text-xs text-slate-500">#{current + 1}</span>
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="whitespace-pre-wrap text-base font-medium text-slate-900 sm:text-lg">
              {lang === "si" ? q.text_si : q.text_en ?? q.text_si}
            </p>
          </div>

          {q.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.image_url}
              alt="Question diagram"
              className="mt-4 max-h-80 w-auto rounded-lg border border-slate-200"
            />
          )}

          <div className="mt-5 space-y-2">
            {(lang === "si" ? q.options_si : q.options_en).map((opt, i) => {
              if (!opt) return null;
              const value = i + 1;
              const selected = answers[q.id] === value;
              return (
                <button
                  key={i}
                  onClick={() =>
                    setAnswers((a) => ({
                      ...a,
                      [q.id]: selected ? null : value,
                    }))
                  }
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                    selected
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      selected
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {value}
                  </span>
                  <span className="text-sm text-slate-800">{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="btn-outline"
            >
              <ChevronLeft className="h-4 w-4" /> පෙර
            </button>

            {current < questions.length - 1 ? (
              <button
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                className="btn-primary"
              >
                ඊළඟ <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={submitting}
                className="btn-primary"
              >
                <Send className="h-4 w-4" /> ඉදිරිපත් කරන්න
              </button>
            )}
          </div>
        </div>

        {/* Palette */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">ප්‍රශ්න පුවරුව</span>
              <span className="text-[10px] uppercase text-slate-400">Palette</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-5">
              {questions.map((qq, i) => {
                const isAnswered = answers[qq.id] != null;
                const isCurrent = i === current;
                return (
                  <button
                    key={qq.id}
                    onClick={() => setCurrent(i)}
                    className={`grid h-8 w-8 place-items-center rounded-md text-xs font-semibold transition ${
                      isCurrent ? "ring-2 ring-brand-500 ring-offset-1" : ""
                    } ${
                      isAnswered
                        ? "bg-brand-600 text-white hover:bg-brand-700"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setConfirmOpen(true)}
              disabled={submitting}
              className="btn-primary mt-3 w-full"
            >
              <Send className="h-4 w-4" /> ඉදිරිපත් කරන්න
            </button>
            <p className="mt-2 text-[10px] leading-tight text-slate-500">
              පිළිතුරු ස්වයංක්‍රීයව සුරැකේ. වේලාව අවසන් වූ විට ස්වයංක්‍රීයව ඉදිරිපත් වේ.
            </p>
          </div>
        </aside>
      </div>

      {/* Confirm dialog */}
      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)}>
          <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">ඉදිරිපත් කරන්නද?</h2>
          <p className="mt-1 text-sm text-slate-600">
            ඔබ ප්‍රශ්න {questions.length} න් <strong>{answeredCount}</strong> කට පිළිතුරු දී ඇත.
            ඉදිරිපත් කිරීමෙන් පසු නැවත වෙනස් කළ නොහැක.
          </p>
          {submitError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {submitError}
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className="btn-outline flex-1"
            >
              රැඳී සිටින්න
            </button>
            <button
              onClick={() => submit(false)}
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              ඉදිරිපත් කරන්න
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty questions view                                              */
/* ------------------------------------------------------------------ */

function EmptyQuestionsView({ quiz }: { quiz: QuizMeta }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-600">
        <Library className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900">ප්‍රශ්න නොමැත</h1>
      <p className="mt-1 text-sm text-slate-600">
        මෙම ප්‍රශ්නාවලියට තවම ප්‍රශ්න එක් කර නොමැත. කරුණාකර පරිපාලකයා අමතන්න.
      </p>
      <p className="mt-3 text-xs text-slate-500">{quiz.title}</p>
      <Link href="/student/dashboard" className="btn-primary mt-6">
        <ArrowLeft className="h-4 w-4" /> මුල් පිටුවට
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review view                                                       */
/* ------------------------------------------------------------------ */

function ReviewView({
  quiz,
  attempt,
  questions,
  lang,
  onToggleLang,
}: {
  quiz: QuizMeta;
  attempt: AttemptMeta;
  questions: ReviewQuestion[];
  lang: "si" | "en";
  onToggleLang: (l: "si" | "en") => void;
}) {
  const pct = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
  const grade = pct >= 75 ? "green" : pct >= 50 ? "amber" : "red";

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
      <Link
        href="/student/dashboard"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> මුල් පිටුවට
      </Link>

      <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{quiz.title}</h1>

      {/* Score card */}
      <div
        className={`card mt-4 border-l-4 p-5 ${
          grade === "green"
            ? "border-l-green-500"
            : grade === "amber"
              ? "border-l-amber-500"
              : "border-l-red-500"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">ඔබේ ලකුණු</div>
            <div className="mt-1 text-4xl font-bold text-slate-900">
              {attempt.score}
              <span className="text-2xl text-slate-400">/{attempt.total}</span>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {pct}% · වේලාව {fmtDuration(attempt.time_spent_seconds)}
            </div>
          </div>
          <div
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-bold ${
              grade === "green"
                ? "bg-green-50 text-green-700"
                : grade === "amber"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
            }`}
          >
            {pct}%
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => onToggleLang(lang === "si" ? "en" : "si")}
            className="btn-outline text-xs"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "si" ? "English" : "සිංහල"}
          </button>
        </div>
      </div>

      {/* Questions review */}
      <div className="mt-6 space-y-4">
        {questions.map((q, i) => {
          const opts = lang === "si" ? q.options_si : q.options_en;
          const text = lang === "si" ? q.text_si : q.text_en ?? q.text_si;
          const explanation =
            lang === "si" ? q.explanation_si : q.explanation_en ?? q.explanation_si;

          return (
            <div key={q.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                    {i + 1}
                  </span>
                  <span className="badge bg-slate-100 text-slate-700">{q.topic}</span>
                </div>
                {q.is_correct ? (
                  <span className="badge bg-green-50 text-green-700">
                    <CheckCircle2 className="h-3 w-3" /> නිවැරදි
                  </span>
                ) : (
                  <span className="badge bg-red-50 text-red-700">
                    <XCircle className="h-3 w-3" /> වැරදි
                  </span>
                )}
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm font-medium text-slate-900 sm:text-base">
                {text}
              </p>

              {q.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={q.image_url}
                  alt="Diagram"
                  className="mt-3 max-h-64 rounded-lg border border-slate-200"
                />
              )}

              <div className="mt-3 space-y-2">
                {opts.map((opt, idx) => {
                  if (!opt) return null;
                  const value = idx + 1;
                  const isCorrect = value === q.correct_option;
                  const isSelected = value === q.selected_option;
                  const isWrong = isSelected && !isCorrect;

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                        isCorrect
                          ? "border-green-300 bg-green-50"
                          : isWrong
                            ? "border-red-300 bg-red-50"
                            : "border-slate-200"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          isCorrect
                            ? "bg-green-600 text-white"
                            : isWrong
                              ? "bg-red-600 text-white"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {value}
                      </span>
                      <span className="flex-1 text-slate-800">{opt}</span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold uppercase text-slate-500">
                          ඔබ
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {explanation && (
                <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/50 p-3">
                  <div className="mb-1 text-xs font-semibold text-brand-800">
                    පැහැදිලි කිරීම
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link href="/student/leaderboard" className="btn-outline">
          <Flag className="h-4 w-4" /> ශ්‍රේණිගත කිරීම් බලන්න
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Unavailable view                                                  */
/* ------------------------------------------------------------------ */

function UnavailableView({
  quiz,
  window: windowMeta,
  reason,
}: {
  quiz: QuizMeta;
  window: WindowMeta;
  reason: UnavailableReason;
}) {
  const [remaining, setRemaining] = useState(windowMeta.remaining_seconds);

  useEffect(() => {
    if (reason !== "not_started") return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [reason]);

  const meta = (() => {
    switch (reason) {
      case "not_started":
        return {
          icon: <Clock className="h-7 w-7" />,
          tone: "amber" as const,
          title: "තවම ආරම්භ වී නැත",
          desc: `ප්‍රශ්නාවලිය ${formatCountdown(remaining)} කින් ආරම්භ වේ.`,
        };
      case "expired":
        return {
          icon: <XCircle className="h-7 w-7" />,
          tone: "slate" as const,
          title: "ප්‍රශ්නාවලිය අවසන් විය",
          desc: "මෙම ප්‍රශ්නාවලියට සහභාගී වීමට නියමිත වේලාව ඉක්මවා ඇත.",
        };
      case "wrong_medium":
        return {
          icon: <Globe className="h-7 w-7" />,
          tone: "amber" as const,
          title: "වෙනත් මාධ්‍යයක ප්‍රශ්නාවලියක්",
          desc: "මෙම ප්‍රශ්නාවලිය ඔබ ලියාපදිංචි වූ ඉගෙනුම් මාධ්‍යයට අදාළ නොවේ.",
        };
      case "unpublished":
      default:
        return {
          icon: <AlertTriangle className="h-7 w-7" />,
          tone: "slate" as const,
          title: "ප්‍රකාශයට පත් කර නැත",
          desc: "මෙම ප්‍රශ්නාවලිය තවම ප්‍රකාශයට පත් කර නොමැත.",
        };
    }
  })();

  const toneClass =
    meta.tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500";

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${toneClass}`}>
        {meta.icon}
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900">{meta.title}</h1>
      <p className="mt-1 text-sm text-slate-600">{meta.desc}</p>
      <p className="mt-3 text-xs text-slate-500">{quiz.title}</p>
      <Link href="/student/dashboard" className="btn-primary mt-6">
        <ArrowLeft className="h-4 w-4" /> මුල් පිටුවට
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small shared bits                                                 */
/* ------------------------------------------------------------------ */

function TimerPill({ remaining, warning }: { remaining: number; warning: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ${
        warning ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-800"
      }`}
    >
      <Clock className="h-3.5 w-3.5" />
      {formatCountdown(remaining)}
    </span>
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

function CenterSpinner({ label }: { label: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {message}
      </div>
      <button onClick={onRetry} className="btn-outline mt-4">
        <RefreshCw className="h-4 w-4" /> නැවත උත්සාහ කරන්න
      </button>
    </div>
  );
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}