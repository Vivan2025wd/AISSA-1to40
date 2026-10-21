import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServiceSupabase } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getQuizWindow } from "@/lib/quiz-window";

export const dynamic = "force-dynamic";

/** Grace period after quiz end, so a slow submit over a laggy connection still lands. */
const SUBMIT_GRACE_MS = 90_000;

type RouteCtx = { params: Promise<{ id: string }> };

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
  /** The quiz's medium — the client uses this to derive the display language. */
  medium: Medium;
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
  /** Populated only when the quiz is Sinhala-medium. */
  text_si: string;
  /** Populated only when the quiz is English-medium. */
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

type UnavailableReason =
  | "not_started"
  | "expired"
  | "unpublished"
  | "wrong_medium";

type GetResponse =
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
/*  GET — load quiz for exam or review                                */
/* ------------------------------------------------------------------ */

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { id: quizId } = await params;

  /* 1. Authenticate via cookie-based SSR client */
  const ssr = await createClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return jsonError(401, "Not authenticated");

  /* 2. Service client — reads bypass RLS, shape is controlled server-side */
  const svc = serviceClient();

  /* 3. Load quiz + admin flag + caller's medium in parallel */
  const [quizRes, profileRes] = await Promise.all([
    svc
      .from("quizzes")
      .select("id, title, description, scheduled_at, duration_minutes, is_published, medium")
      .eq("id", quizId)
      .maybeSingle(),
    svc.from("profiles").select("is_admin, medium").eq("id", user.id).single(),
  ]);

  const quizRow = quizRes.data;
  if (!quizRow) return jsonError(404, "Quiz not found");

  const isAdmin = !!profileRes.data?.is_admin;
  const quizMedium: Medium = quizRow.medium === "en" ? "en" : "si";

  /* 3a. Unpublished → hidden from students, visible to admins */
  if (!quizRow.is_published && !isAdmin) {
    return NextResponse.json<GetResponse>({
      mode: "unavailable",
      quiz: toMeta(quizRow, 0),
      window: toWindow(quizRow),
      reason: "unpublished",
    });
  }

  /* 3b. Medium gate — students only access quizzes matching their medium */
  const studentMedium = profileRes.data?.medium ?? "si";
  if (!isAdmin && quizMedium !== studentMedium) {
    return NextResponse.json<GetResponse>({
      mode: "unavailable",
      quiz: toMeta(quizRow, 0),
      window: toWindow(quizRow),
      reason: "wrong_medium",
    });
  }

  /* 4. Load linked questions in order */
  const { data: linkRows, error: linkErr } = await svc
    .from("quiz_questions")
    .select(`
      order_index,
      question:questions (
        id, topic,
        question_text_si, question_text_en,
        option_1_si, option_2_si, option_3_si, option_4_si, option_5_si,
        option_1_en, option_2_en, option_3_en, option_4_en, option_5_en,
        correct_option,
        explanation_si, explanation_en,
        image_url
      )
    `)
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true });

  if (linkErr) return jsonError(500, linkErr.message);

  type RawQuestion = {
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
  };

  const rawQuestions = (linkRows ?? [])
    .map((r) => (Array.isArray(r.question) ? r.question[0] ?? null : r.question) as RawQuestion | null)
    .filter((q): q is RawQuestion => q !== null);

  const quizMeta = toMeta(quizRow, rawQuestions.length);
  const windowMeta = toWindow(quizRow);

  /* 5. Check for an existing attempt */
  const { data: existing } = await svc
    .from("quiz_results")
    .select("id, score, total, time_spent_seconds, submitted_at")
    .eq("quiz_id", quizId)
    .eq("student_id", user.id)
    .maybeSingle();

  /* 6. Branch: review / exam / unavailable */

  if (existing) {
    // Review mode — include correct options + the quiz's own explanations only
    const { data: answers } = await svc
      .from("quiz_answers")
      .select("question_id, selected_option, is_correct")
      .eq("result_id", existing.id);

    const answerMap = new Map<string, { selected_option: number | null; is_correct: boolean }>();
    for (const a of answers ?? []) {
      answerMap.set(a.question_id, {
        selected_option: a.selected_option,
        is_correct: a.is_correct,
      });
    }

    const reviewQuestions: ReviewQuestion[] = rawQuestions.map((q) => {
      const ans = answerMap.get(q.id);
      return {
        ...shapeExamQuestion(q, quizMedium),
        correct_option: q.correct_option,
        selected_option: ans?.selected_option ?? null,
        is_correct: ans?.is_correct ?? false,
        // Only expose the explanation for the quiz's own medium
        explanation_si:
          quizMedium === "si" ? q.explanation_si ?? null : null,
        explanation_en:
          quizMedium === "en"
            ? q.explanation_en ?? q.explanation_si ?? null
            : null,
      };
    });

    return NextResponse.json<GetResponse>({
      mode: "review",
      quiz: quizMeta,
      window: windowMeta,
      attempt: {
        result_id: existing.id,
        score: existing.score,
        total: existing.total,
        time_spent_seconds: existing.time_spent_seconds,
        submitted_at: existing.submitted_at,
      },
      questions: reviewQuestions,
    });
  }

  if (windowMeta.status === "upcoming") {
    return NextResponse.json<GetResponse>({
      mode: "unavailable",
      quiz: quizMeta,
      window: windowMeta,
      reason: "not_started",
    });
  }

  if (windowMeta.status === "expired") {
    return NextResponse.json<GetResponse>({
      mode: "unavailable",
      quiz: quizMeta,
      window: windowMeta,
      reason: "expired",
    });
  }

  // Active + no attempt → exam
  return NextResponse.json<GetResponse>({
    mode: "exam",
    quiz: quizMeta,
    window: windowMeta,
    questions: rawQuestions.map((q) => shapeExamQuestion(q, quizMedium)),
  });
}

/* ------------------------------------------------------------------ */
/*  POST — submit answers, score, persist                             */
/* ------------------------------------------------------------------ */

interface SubmitBody {
  answers: { question_id: string; selected_option: number | null }[];
  time_spent_seconds: number;
}

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { id: quizId } = await params;

  const ssr = await createClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return jsonError(401, "Not authenticated");

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  if (!Array.isArray(body.answers)) return jsonError(400, "Missing answers[]");

  const svc = serviceClient();

  /* 1. Quiz must exist */
  const { data: quiz } = await svc
    .from("quizzes")
    .select("id, scheduled_at, duration_minutes, medium, is_published")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) return jsonError(404, "Quiz not found");

  /* 1b. Confirm caller's medium matches the quiz */
  const { data: profile } = await svc
    .from("profiles")
    .select("is_admin, medium")
    .eq("id", user.id)
    .single();
  const isAdmin = !!profile?.is_admin;
  const studentMedium = profile?.medium ?? "si";
  const quizMedium = (quiz as { medium?: string | null }).medium ?? "si";

  if (!isAdmin && quizMedium !== studentMedium) {
    return jsonError(403, "This quiz is not available in your medium");
  }
  if (!isAdmin && !(quiz as { is_published?: boolean | null }).is_published) {
    return jsonError(403, "Quiz is not published");
  }

  /* 2. Must be within window (+ grace) */
  const startMs = new Date(quiz.scheduled_at).getTime();
  const endMs = startMs + quiz.duration_minutes * 60_000;
  const now = Date.now();
  if (now < startMs) return jsonError(409, "Quiz has not started yet");
  if (now > endMs + SUBMIT_GRACE_MS) return jsonError(409, "Quiz window has closed");

  /* 3. Reject double attempts early */
  const { data: existing } = await svc
    .from("quiz_results")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (existing) return jsonError(409, "Already submitted");

  /* 4. Load answer key for linked questions only */
  const { data: keyRows, error: keyErr } = await svc
    .from("quiz_questions")
    .select("question:questions (id, correct_option)")
    .eq("quiz_id", quizId);
  if (keyErr) return jsonError(500, keyErr.message);

  const keyMap = new Map<string, number>();
  for (const row of keyRows ?? []) {
    const questions = (row as { question: { id: string; correct_option: number }[] | null }).question;
    for (const q of questions ?? []) keyMap.set(q.id, q.correct_option);
  }
  const total = keyMap.size;
  if (total === 0) return jsonError(409, "Quiz has no questions");

  /* 5. Score server-side (language-agnostic — correct_option is index-based) */
  const selectedMap = new Map(body.answers.map((a) => [a.question_id, a.selected_option]));
  let score = 0;
  const rows: {
    question_id: string;
    selected_option: number | null;
    is_correct: boolean;
  }[] = [];

  for (const [qid, correct] of keyMap) {
    const selected = selectedMap.get(qid) ?? null;
    const isCorrect = selected !== null && selected === correct;
    if (isCorrect) score += 1;
    rows.push({ question_id: qid, selected_option: selected, is_correct: isCorrect });
  }

  const safeTime = Math.max(0, Math.min(Number(body.time_spent_seconds) || 0, quiz.duration_minutes * 60));

  /* 6. Insert result */
  const { data: result, error: resultErr } = await svc
    .from("quiz_results")
    .insert({
      student_id: user.id,
      quiz_id: quizId,
      score,
      total,
      time_spent_seconds: safeTime,
    })
    .select("id, score, total, submitted_at")
    .single();

  if (resultErr || !result) {
    if (resultErr?.code === "23505") return jsonError(409, "Already submitted");
    return jsonError(500, resultErr?.message ?? "Failed to save result");
  }

  /* 7. Insert per-question audit rows */
  const { error: answersErr } = await svc.from("quiz_answers").insert(
    rows.map((r) => ({
      result_id: result.id,
      question_id: r.question_id,
      selected_option: r.selected_option,
      is_correct: r.is_correct,
    }))
  );

  if (answersErr) {
    console.error("[quiz:submit] failed to insert answers:", answersErr.message);
  }

  return NextResponse.json({
    result_id: result.id,
    score: result.score,
    total: result.total,
    submitted_at: result.submitted_at,
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function serviceClient() {
  return createServiceSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function toMeta(
  row: {
    id: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    duration_minutes: number;
    medium?: string | null;
  },
  questionCount: number
): QuizMeta {
  const medium: Medium = row.medium === "en" ? "en" : "si";
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    scheduled_at: row.scheduled_at,
    duration_minutes: row.duration_minutes,
    question_count: questionCount,
    medium,
  };
}

function toWindow(row: { scheduled_at: string; duration_minutes: number }): WindowMeta {
  const w = getQuizWindow(row.scheduled_at, row.duration_minutes);
  return {
    status: w.status,
    remaining_seconds: w.remainingSeconds,
    start_ms: w.startMs,
    end_ms: w.endMs,
  };
}

/**
 * Shapes a raw DB question into the API response, **filtered by medium**.
 *
 * Sinhala quiz  → only SI fields populate; EN fields are nulled/emptied
 * English quiz  → only EN fields populate; SI fields are nulled/emptied
 *                  (falls back to SI text if EN is missing on any field)
 */
function shapeExamQuestion(
  q: {
    id: string;
    topic: string;
    question_text_si: string;
    question_text_en: string | null;
    option_1_si: string; option_2_si: string; option_3_si: string;
    option_4_si: string; option_5_si: string | null;
    option_1_en: string | null; option_2_en: string | null; option_3_en: string | null;
    option_4_en: string | null; option_5_en: string | null;
    image_url: string | null;
  },
  medium: Medium
): ExamQuestion {
  if (medium === "en") {
    // English quiz — keep EN, fall back to SI only where EN is missing
    return {
      id: q.id,
      topic: q.topic,
      text_si: "",
      text_en: q.question_text_en ?? q.question_text_si,
      options_si: [],
      options_en: [
        q.option_1_en ?? q.option_1_si,
        q.option_2_en ?? q.option_2_si,
        q.option_3_en ?? q.option_3_si,
        q.option_4_en ?? q.option_4_si,
        q.option_5_en ?? q.option_5_si,
      ],
      image_url: q.image_url,
    };
  }

  // Sinhala quiz — keep SI, drop EN entirely
  return {
    id: q.id,
    topic: q.topic,
    text_si: q.question_text_si,
    text_en: null,
    options_si: [
      q.option_1_si,
      q.option_2_si,
      q.option_3_si,
      q.option_4_si,
      q.option_5_si,
    ],
    options_en: [],
    image_url: q.image_url,
  };
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}