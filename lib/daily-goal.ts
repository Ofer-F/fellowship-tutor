export type DailyState = {
  goal: number;
  completionsByDate: Record<string, number>;
};

const STORAGE_PREFIX = "fellowship-tutor:daily:";
const DEFAULT_GOAL = 1;
const GOAL_OPTIONS = [1, 2, 3, 5];

function storageKey(courseId: string): string {
  return `${STORAGE_PREFIX}${courseId}`;
}

function todayIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isDailyState(value: unknown): value is DailyState {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.goal !== "number") return false;
  if (typeof s.completionsByDate !== "object" || s.completionsByDate === null)
    return false;
  return Object.values(s.completionsByDate).every(
    (v) => typeof v === "number"
  );
}

const EMPTY: DailyState = {
  goal: DEFAULT_GOAL,
  completionsByDate: {},
};

export function loadDailyState(courseId: string): DailyState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(courseId));
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return isDailyState(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveDailyState(courseId: string, state: DailyState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(courseId), JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

export function getCompletedToday(state: DailyState): number {
  return state.completionsByDate[todayIso()] ?? 0;
}

export function recordLessonCompletionToday(
  courseId: string,
  state: DailyState
): DailyState {
  const today = todayIso();
  const next: DailyState = {
    goal: state.goal,
    completionsByDate: {
      ...state.completionsByDate,
      [today]: (state.completionsByDate[today] ?? 0) + 1,
    },
  };
  saveDailyState(courseId, next);
  return next;
}

export function cycleDailyGoal(
  courseId: string,
  state: DailyState
): DailyState {
  const currentIndex = GOAL_OPTIONS.indexOf(state.goal);
  const nextGoal =
    GOAL_OPTIONS[(currentIndex + 1 + GOAL_OPTIONS.length) % GOAL_OPTIONS.length];
  const next: DailyState = { ...state, goal: nextGoal };
  saveDailyState(courseId, next);
  return next;
}

export { GOAL_OPTIONS };
