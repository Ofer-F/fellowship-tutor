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
