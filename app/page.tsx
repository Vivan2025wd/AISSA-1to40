import Link from "next/link";
import {
  FlaskConical,
  Trophy,
  ClipboardList,
  Languages,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  Timer,
  LineChart,
  GraduationCap,
  ShieldCheck,
  Zap,
  Menu,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-800 antialiased">
      {/* ============================================================ */}
      {/*  Header                                                      */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-500/30">
              <FlaskConical className="h-4.5 w-4.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-bold tracking-tight text-slate-900">
                O/L Science Quiz
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Sri Lanka
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/auth/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:px-4"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-600 sm:px-4"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  Hero                                                        */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden">
        {/* Background accents */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />
          <div className="absolute -top-40 left-1/2 h-105 w-180 -translate-x-1/2 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-slate-200/50 blur-3xl" />
          <div className="absolute -left-24 top-72 h-72 w-72 rounded-full bg-sky-100/60 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1 text-[11px] font-semibold text-sky-700 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Free for Sri Lankan O/L students
            </span>

            <h1 className="mt-6 text-[34px] font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              Master O/L Science with{" "}
              <span className="bg-linear-to-r from-sky-500 to-sky-700 bg-clip-text text-transparent">
                competitive quizzes
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:mt-6 sm:text-lg">
              Compete with students island-wide, sharpen your knowledge, and climb
              the leaderboard — with detailed explanations for every question.
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/auth/register"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-600 hover:shadow-xl hover:shadow-sky-500/30 active:scale-[0.98] sm:py-3"
              >
                Start learning free
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-[15px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] sm:py-3"
              >
                I already have an account
              </Link>
            </div>

            {/* Trust row */}
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-500 sm:mt-10 sm:gap-x-6 sm:text-xs">
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-sky-500" />
                No credit card
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-sky-500" />
                Sinhala &amp; English
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-sky-500" />
                Instant scoring
              </li>
            </ul>
          </div>

          {/* Mock exam preview */}
          <div className="mx-auto mt-14 max-w-4xl sm:mt-20">
            <ExamPreview />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Stats strip                                                 */}
      {/* ============================================================ */}
      <section className="border-y border-slate-200 bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-4 py-8 sm:grid-cols-4 sm:px-6 sm:py-10">
          <Stat value="100%" label="Free forever" />
          <Stat value="2" label="Languages" />
          <Stat value="9" label="Provinces" />
          <Stat value="24/7" label="Available" />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Features                                                    */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <h2 className="text-[26px] font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to prepare
          </h2>
          <p className="mt-3 text-[15px] text-slate-600 sm:text-base">
            Built for the way Sri Lankan students actually study — focused,
            competitive, and clear.
          </p>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <Feature
            icon={<ClipboardList className="h-5 w-5" />}
            title="Scheduled live exams"
            desc="Admin-published quizzes open at a fixed time — everyone competes on the same questions, same clock."
          />
          <Feature
            icon={<Timer className="h-5 w-5" />}
            title="Real-time countdown"
            desc="Auto-saved answers, timed sessions, and automatic submission when the clock runs out."
          />
          <Feature
            icon={<Trophy className="h-5 w-5" />}
            title="Island-wide rankings"
            desc="See how you stack up against students from every district — updated the moment you submit."
          />
          <Feature
            icon={<Languages className="h-5 w-5" />}
            title="Sinhala &amp; English"
            desc="Take quizzes in your chosen medium. Questions and explanations in both languages."
          />
          <Feature
            icon={<LineChart className="h-5 w-5" />}
            title="Progress analytics"
            desc="Track your average, best score, and island rank across every quiz you attempt."
          />
          <Feature
            icon={<GraduationCap className="h-5 w-5" />}
            title="Detailed review mode"
            desc="After every quiz, review each question with the correct answer and full worked explanation."
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  How it works                                                */}
      {/* ============================================================ */}
      <section className="border-y border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <h2 className="text-[26px] font-bold tracking-tight text-slate-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-[15px] text-slate-600 sm:text-base">
              Three steps. Under a minute.
            </p>
          </div>

          <ol className="grid gap-4 sm:grid-cols-3">
            <Step
              n={1}
              icon={<Users className="h-4 w-4" />}
              title="Sign up"
              desc="Create your account with just your name, email, and school."
            />
            <Step
              n={2}
              icon={<Zap className="h-4 w-4" />}
              title="Take a quiz"
              desc="Join a live exam when it opens. Answer at your pace — the timer handles the rest."
            />
            <Step
              n={3}
              icon={<Trophy className="h-4 w-4" />}
              title="See your rank"
              desc="Get instant results, review every question, and watch your island ranking climb."
            />
          </ol>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Bottom CTA                                                  */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-linear-to-br from-sky-50 via-white to-slate-50 p-8 text-center shadow-sm sm:rounded-3xl sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-slate-200/40 blur-3xl"
          />

          <div className="relative">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/30">
              <FlaskConical className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-[26px] font-bold tracking-tight text-slate-900 sm:text-4xl">
              Ready to test yourself?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] text-slate-600 sm:text-base">
              Join students from across Sri Lanka. Free forever, no strings
              attached.
            </p>
            <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/auth/register"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] sm:py-3"
              >
                Create free account
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-[15px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] sm:py-3"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Footer                                                      */}
      {/* ============================================================ */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500 text-white">
              <FlaskConical className="h-3.5 w-3.5" />
            </div>
            <span>O/L Science Quiz · Built for Sri Lankan students</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Private &amp; secure
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Island-wide
            </span>
            <span className="text-slate-300">·</span>
            <span>🇱🇰 Made in Sri Lanka</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ================================================================== */
/*  Sub-components                                                    */
/* ================================================================== */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
        {label}
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100/60 sm:p-6">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600 transition group-hover:bg-sky-500 group-hover:text-white">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="relative rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-sky-500 text-sm font-bold text-white shadow-sm shadow-sky-500/30">
          {n}
        </div>
        <div className="text-slate-400">{icon}</div>
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</p>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Mock exam preview — visual anchor for the hero                    */
/* ------------------------------------------------------------------ */

function ExamPreview() {
  const options = [
    { n: 1, text: "Photosynthesis", selected: false },
    { n: 2, text: "Respiration", selected: true },
    { n: 3, text: "Transpiration", selected: false },
    { n: 4, text: "Germination", selected: false },
  ];

  return (
    <div className="relative">
      {/* Glow */}
      <div
        aria-hidden
        className="absolute inset-x-8 -bottom-6 h-24 rounded-full bg-sky-300/30 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 sm:rounded-3xl">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="mx-auto hidden max-w-60 flex-1 truncate rounded-md bg-white px-3 py-1 text-center text-[11px] text-slate-400 ring-1 ring-slate-200 sm:block">
            ol-science-quiz.app/exam
          </div>
        </div>

        {/* Exam body */}
        <div className="p-4 sm:p-6">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
              <ClipboardList className="h-3 w-3" />
              Physics · Quiz 01
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-700">
              <Timer className="h-3 w-3" />
              12:45
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
            <span>Question 7 of 20</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[35%] rounded-full bg-sky-500" />
            </div>
          </div>

          {/* Question */}
          <p className="mt-4 text-sm font-medium leading-relaxed text-slate-900 sm:text-base">
            Which process in plants primarily releases oxygen into the
            atmosphere?
          </p>

          {/* Options */}
          <ul className="mt-3 space-y-2">
            {options.map((o) => (
              <li key={o.n}>
                <div
                  className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm ${
                    o.selected
                      ? "border-sky-400 bg-sky-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      o.selected
                        ? "bg-sky-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {o.n}
                  </span>
                  <span className="text-slate-800">{o.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -right-2 -top-3 hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 sm:inline-flex">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Auto-saved
      </div>
    </div>
  );
}