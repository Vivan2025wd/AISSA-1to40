"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Flag,
  Send,
  RefreshCw,
  Library,
  Globe,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { formatCountdown } from "@/lib/quiz-window";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type Medium = "si" | "en";

interface QuizMeta {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  question_count: number;
  medium?: Medium;
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

type UnavailableReason = "not_started" | "expired" | "unpublished";

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

  const fetchQuiz = useCallback(async (): Promise<ApiResponse> => {
    const res = await fetch(`/api/quiz/${quizId}`, { cache: "no-store" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? `HTTP ${res.status}`);
    }
    return res.json();
  }, [quizId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchQuiz());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchQuiz]);

  useEffect(() => {
    let cancelled = false;

    const fetchInitialQuiz = async () => {
      try {
        const result = await fetchQuiz();
        if (!cancelled) setData(result);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchInitialQuiz();
    return () => {
      cancelled = true;
    };
  }, [fetchQuiz]);

  if (loading) return <CenterSpinner label="Loading quiz…" />;
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

  /**
   * Language is FIXED to the quiz's medium.
   * No toggle — students only ever see their own registered medium.
   */
  const lang: Medium = data.quiz.medium === "en" ? "en" : "si";

  if (data.mode === "review") {
    return (
      <ReviewView
        quiz={data.quiz}
        attempt={data.attempt}
        questions={data.questions}
        lang={lang}
      />
    );
  }

  return (
    <ExamView
      quiz={data.quiz}
      window={data.window}
      questions={data.questions}
      lang={lang}
      onSubmitted={() => {
        load();
        router.refresh();
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Exam view                                                         */
/* ------------------------------------------------------------------ */

function ExamView({
  quiz,
  window: windowMeta,
  questions,
  lang,
  onSubmitted,
}: {
  quiz: QuizMeta;
  window: WindowMeta;
  questions: ExamQuestion[];
  lang: Medium;
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

  const startedAtRef = useRef<number>(0);
  useEffect(() => {
    startedAtRef.current =
      Date.now() - (quiz.duration_minutes * 60 - windowMeta.remaining_seconds) * 1000;
  }, [quiz.duration_minutes, windowMeta.remaining_seconds]);
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
      } catch (e: unknown) {
        setSubmitError(e instanceof Error ? e.message : "Submit failed");
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

  if (questions.length === 0) {
    return <EmptyQuestionsView quiz={quiz} />;
  }

  const q = questions[current];
  const progressPct = ((current + 1) / questions.length) * 100;

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6">
      {/* ============ Top bar ============ */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-1 py-0.5 text-xs font-medium text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <h1 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {quiz.title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Medium badge — informational only, no toggle */}
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            <Globe className="h-3 w-3" />
            {lang === "si" ? "Sinhala" : "English"}
          </span>

          <TimerPill
            remaining={remaining}
            warning={remaining <= warningThreshold}
          />
        </div>
      </div>

      {/* ============ Progress ============ */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <span className="font-medium text-slate-700">{answeredCount}</span>
            <span>of {questions.length} answered</span>
          </span>
          <span className="font-medium tabular-nums text-slate-500">
            Question {current + 1} / {questions.length}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-linear-to-r from-sky-500 to-sky-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        {/* ============ Question card ============ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                {q.topic}
              </span>
              <span className="text-xs font-medium tabular-nums text-slate-400">
                #{current + 1}
              </span>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="whitespace-pre-wrap text-base font-medium leading-relaxed text-slate-900 sm:text-[17px]">
              {lang === "si" ? q.text_si : q.text_en ?? q.text_si}
            </p>
          </div>

          {q.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.image_url}
              alt="Question diagram"
              className="mt-4 max-h-80 w-auto rounded-xl border border-slate-200 object-contain"
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
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition active:scale-[0.99] sm:p-3 ${
                    selected
                      ? "border-sky-400 bg-sky-50/60 shadow-sm shadow-sky-500/5"
                      : "border-slate-200 hover:border-sky-200 hover:bg-slate-50/60 active:bg-slate-100"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums transition sm:h-6 sm:w-6 ${
                      selected
                        ? "bg-sky-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {value}
                  </span>
                  <span className="flex-1 text-sm leading-relaxed text-slate-800">
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:py-2.5"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>

            {current < questions.length - 1 ? (
              <button
                onClick={() =>
                  setCurrent((c) => Math.min(questions.length - 1, c + 1))
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] sm:py-2.5"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:opacity-50 sm:py-2.5"
              >
                <Send className="h-4 w-4" /> Submit
              </button>
            )}
          </div>
        </div>

        {/* ============ Palette ============ */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Questions
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
              {questions.map((qq, i) => {
                const isAnswered = answers[qq.id] != null;
                const isCurrent = i === current;
                return (
                  <button
                    key={qq.id}
                    onClick={() => setCurrent(i)}
                    aria-label={`Go to question ${i + 1}`}
                    className={`relative grid h-10 w-10 place-items-center rounded-lg text-xs font-bold tabular-nums transition active:scale-95 sm:h-9 sm:w-9 ${
                      isCurrent ? "ring-2 ring-sky-500 ring-offset-2" : ""
                    } ${
                      isAnswered
                        ? "bg-sky-500 text-white hover:bg-sky-600"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {i + 1}
                    {isCurrent && (
                      <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Answered
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Empty
              </span>
            </div>

            <button
              onClick={() => setConfirmOpen(true)}
              disabled={submitting}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:opacity-50 sm:py-2.5"
            >
              <Send className="h-4 w-4" /> Submit quiz
            </button>

            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                Your answers save automatically. The quiz submits itself when
                time runs out.
              </span>
            </p>
          </div>
        </aside>
      </div>

      {/* ============ Confirm dialog ============ */}
      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)}>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Submit your quiz?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            You&apos;ve answered{" "}
            <strong className="font-semibold text-slate-900">
              {answeredCount}
            </strong>{" "}
            of {questions.length} questions.
          </p>

          {answeredCount < questions.length && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {questions.length - answeredCount} question
                {questions.length - answeredCount !== 1 ? "s" : ""} still
                unanswered
              </span>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            You can&apos;t change your answers after submitting.
          </p>

          {submitError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-700">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 sm:py-2.5"
            >
              Keep working
            </button>
            <button
              onClick={() => submit(false)}
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:opacity-50 sm:py-2.5"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit
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
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-600">
        <Library className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
        No questions yet
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        This quiz doesn&apos;t have any questions attached. Please contact an
        administrator.
      </p>
      <p className="mt-3 text-xs text-slate-400">{quiz.title}</p>
      <Link
        href="/student/dashboard"
        className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] sm:py-2.5"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
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
}: {
  quiz: QuizMeta;
  attempt: AttemptMeta;
  questions: ReviewQuestion[];
  lang: Medium;
}) {
  const pct =
    attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
  const grade = pct >= 75 ? "emerald" : pct >= 50 ? "amber" : "red";
  const correctCount = questions.filter((q) => q.is_correct).length;
  const wrongCount = questions.length - correctCount;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
      <Link
        href="/student/dashboard"
        className="inline-flex items-center gap-1 py-0.5 text-xs font-medium text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </Link>

      <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {quiz.title}
      </h1>

      {/* ============ Score card ============ */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className={`h-1.5 ${
            grade === "emerald"
              ? "bg-emerald-500"
              : grade === "amber"
                ? "bg-amber-500"
                : "bg-red-500"
          }`}
        />
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Your score
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-5xl">
                  {attempt.score}
                </span>
                <span className="text-xl font-medium text-slate-400 sm:text-2xl">
                  /{attempt.total}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {correctCount} correct
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  {wrongCount} wrong
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {fmtDuration(attempt.time_spent_seconds)}
                </span>
              </div>
            </div>

            <div
              className={`grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-bold tabular-nums tracking-tight sm:h-20 sm:w-20 sm:text-2xl ${
                grade === "emerald"
                  ? "bg-emerald-50 text-emerald-700"
                  : grade === "amber"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              {pct}%
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <Globe className="h-3 w-3" />
              {lang === "si" ? "Sinhala" : "English"}
            </span>
          </div>
        </div>
      </div>

      {/* ============ Question-by-question review ============ */}
      <div className="mt-6 space-y-4">
        {questions.map((q, i) => {
          const opts = lang === "si" ? q.options_si : q.options_en;
          const text = lang === "si" ? q.text_si : q.text_en ?? q.text_si;
          const explanation =
            lang === "si"
              ? q.explanation_si
              : q.explanation_en ?? q.explanation_si;

          return (
            <div
              key={q.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div
                className={`h-1 ${
                  q.is_correct ? "bg-emerald-500" : "bg-red-500"
                }`}
              />

              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold tabular-nums ${
                        q.is_correct
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {q.topic}
                    </span>
                  </div>
                  {q.is_correct ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
                      <XCircle className="h-3 w-3" /> Wrong
                    </span>
                  )}
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-900 sm:text-base">
                  {text}
                </p>

                {q.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.image_url}
                    alt="Diagram"
                    className="mt-3 max-h-64 rounded-xl border border-slate-200 object-contain"
                  />
                )}

                <div className="mt-4 space-y-2">
                  {opts.map((opt, idx) => {
                    if (!opt) return null;
                    const value = idx + 1;
                    const isCorrect = value === q.correct_option;
                    const isSelected = value === q.selected_option;
                    const isWrong = isSelected && !isCorrect;

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition ${
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50/70"
                            : isWrong
                              ? "border-red-300 bg-red-50/70"
                              : "border-slate-200"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums ${
                            isCorrect
                              ? "bg-emerald-500 text-white"
                              : isWrong
                                ? "bg-red-500 text-white"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {value}
                        </span>
                        <span className="flex-1 leading-relaxed text-slate-800">
                          {opt}
                        </span>
                        {isSelected && (
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                              isCorrect
                                ? "bg-emerald-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            Your pick
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {explanation && (
                  <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/50 p-3 sm:p-4">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-800">
                      <Library className="h-3 w-3" />
                      Explanation
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/student/leaderboard"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.98] sm:py-2.5"
        >
          <Flag className="h-4 w-4" /> View leaderboard
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
          title: "Quiz hasn't started yet",
          desc: "This quiz opens in a little while.",
          showCountdown: true,
        };
      case "expired":
        return {
          icon: <XCircle className="h-7 w-7" />,
          tone: "slate" as const,
          title: "Quiz has ended",
          desc: "The time window for this quiz has closed.",
          showCountdown: false,
        };
      case "unpublished":
      default:
        return {
          icon: <ShieldAlert className="h-7 w-7" />,
          tone: "slate" as const,
          title: "Not published",
          desc: "This quiz hasn't been published yet.",
          showCountdown: false,
        };
    }
  })();

  const toneClass =
    meta.tone === "amber"
      ? "bg-amber-100 text-amber-600"
      : "bg-slate-100 text-slate-500";

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div
        className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${toneClass}`}
      >
        {meta.icon}
      </div>
      <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
        {meta.title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{meta.desc}</p>

      {meta.showCountdown && (
        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold tabular-nums text-amber-800">
          <Clock className="h-4 w-4" />
          {formatCountdown(remaining)}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">{quiz.title}</p>

      <Link
        href="/student/dashboard"
        className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] sm:py-2.5"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small shared bits                                                 */
/* ------------------------------------------------------------------ */

function TimerPill({
  remaining,
  warning,
}: {
  remaining: number;
  warning: boolean;
}) {
  const critical = remaining <= 15;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-bold tabular-nums transition sm:px-3 ${
        critical
          ? "animate-pulse bg-red-500 text-white shadow-sm shadow-red-500/30"
          : warning
            ? "bg-red-50 text-red-700 ring-1 ring-red-200"
            : "bg-slate-100 text-slate-800"
      }`}
    >
      <Clock className="h-3.5 w-3.5" />
      {formatCountdown(remaining)}
    </span>
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
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-900/5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">{children}</div>
      </div>
    </div>
  );
}

function CenterSpinner({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
          <XCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Couldn&apos;t load quiz
        </h2>
        <p className="mt-1 text-sm text-slate-600">{message}</p>
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] sm:py-2.5"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    </div>
  );
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}