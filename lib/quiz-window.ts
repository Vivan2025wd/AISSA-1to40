export type QuizStatus = "upcoming" | "active" | "expired";

export interface QuizWindow {
  status: QuizStatus;
  remainingSeconds: number;
  startMs: number;
  endMs: number;
}

export function getQuizWindow(scheduledAt: string, durationMinutes: number): QuizWindow {
  const startMs = new Date(scheduledAt).getTime();
  const endMs = startMs + durationMinutes * 60_000;
  const now = Date.now();

  if (now < startMs) {
    return { status: "upcoming", remainingSeconds: Math.floor((startMs - now) / 1000), startMs, endMs };
  }
  if (now >= endMs) {
    return { status: "expired", remainingSeconds: 0, startMs, endMs };
  }
  return { status: "active", remainingSeconds: Math.floor((endMs - now) / 1000), startMs, endMs };
}

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}