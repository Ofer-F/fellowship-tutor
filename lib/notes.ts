export type Note = {
  id: string;
  text: string;
  lessonId: string;
  lessonTitle: string;
  createdAt: number;
};

const STORAGE_PREFIX = "fellowship-tutor:notes:";

function storageKey(courseId: string): string {
  return `${STORAGE_PREFIX}${courseId}`;
}

function isNote(value: unknown): value is Note {
  if (typeof value !== "object" || value === null) return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === "string" &&
    typeof n.text === "string" &&
    typeof n.lessonId === "string" &&
    typeof n.lessonTitle === "string" &&
    typeof n.createdAt === "number"
  );
}

export function loadNotes(courseId: string): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(courseId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isNote);
  } catch {
    return [];
  }
}

export function saveNotes(courseId: string, notes: Note[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(courseId), JSON.stringify(notes));
  } catch {
    // ignore quota or storage-disabled errors
  }
}

export function createNoteId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export type LessonColor = {
  border: string;
  chipBg: string;
  chipText: string;
  dot: string;
};

const LESSON_COLORS: LessonColor[] = [
  {
    border: "border-l-amber-400 dark:border-l-amber-500",
    chipBg: "bg-amber-100 dark:bg-amber-900/40",
    chipText: "text-amber-900 dark:text-amber-200",
    dot: "bg-amber-400",
  },
  {
    border: "border-l-emerald-400 dark:border-l-emerald-500",
    chipBg: "bg-emerald-100 dark:bg-emerald-900/40",
    chipText: "text-emerald-900 dark:text-emerald-200",
    dot: "bg-emerald-400",
  },
  {
    border: "border-l-sky-400 dark:border-l-sky-500",
    chipBg: "bg-sky-100 dark:bg-sky-900/40",
    chipText: "text-sky-900 dark:text-sky-200",
    dot: "bg-sky-400",
  },
  {
    border: "border-l-violet-400 dark:border-l-violet-500",
    chipBg: "bg-violet-100 dark:bg-violet-900/40",
    chipText: "text-violet-900 dark:text-violet-200",
    dot: "bg-violet-400",
  },
  {
    border: "border-l-rose-400 dark:border-l-rose-500",
    chipBg: "bg-rose-100 dark:bg-rose-900/40",
    chipText: "text-rose-900 dark:text-rose-200",
    dot: "bg-rose-400",
  },
  {
    border: "border-l-teal-400 dark:border-l-teal-500",
    chipBg: "bg-teal-100 dark:bg-teal-900/40",
    chipText: "text-teal-900 dark:text-teal-200",
    dot: "bg-teal-400",
  },
  {
    border: "border-l-orange-400 dark:border-l-orange-500",
    chipBg: "bg-orange-100 dark:bg-orange-900/40",
    chipText: "text-orange-900 dark:text-orange-200",
    dot: "bg-orange-400",
  },
  {
    border: "border-l-indigo-400 dark:border-l-indigo-500",
    chipBg: "bg-indigo-100 dark:bg-indigo-900/40",
    chipText: "text-indigo-900 dark:text-indigo-200",
    dot: "bg-indigo-400",
  },
];

export function getLessonColor(lessonId: string): LessonColor {
  let hash = 0;
  for (let i = 0; i < lessonId.length; i++) {
    hash = (hash * 31 + lessonId.charCodeAt(i)) | 0;
  }
  return LESSON_COLORS[Math.abs(hash) % LESSON_COLORS.length];
}
