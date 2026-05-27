export type StreakState = {
  lastVisit: string;
  currentStreak: number;
  longestStreak: number;
};

const STORAGE_KEY = "fellowship-tutor:streak";

const EMPTY: StreakState = {
  lastVisit: "",
  currentStreak: 0,
  longestStreak: 0,
};

function todayIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

function isStreakState(value: unknown): value is StreakState {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.lastVisit === "string" &&
    typeof s.currentStreak === "number" &&
    typeof s.longestStreak === "number"
  );
}

export function loadStreak(): StreakState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return isStreakState(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function recordVisit(date: Date = new Date()): StreakState {
  if (typeof window === "undefined") return EMPTY;
  const today = todayIso(date);
  const current = loadStreak();
  if (current.lastVisit === today) return current;

  let nextCurrent = 1;
  if (current.lastVisit) {
    const gap = daysBetween(current.lastVisit, today);
    if (gap === 1) {
      nextCurrent = current.currentStreak + 1;
    } else if (gap <= 0) {
      nextCurrent = current.currentStreak;
    } else {
      nextCurrent = 1;
    }
  }

  const next: StreakState = {
    lastVisit: today,
    currentStreak: nextCurrent,
    longestStreak: Math.max(current.longestStreak, nextCurrent),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
  return next;
}
