import type { UIMessage } from "ai";

const STORAGE_PREFIX = "fellowship-tutor:chat:";

function storageKey(courseId: string, lessonId: string): string {
  return `${STORAGE_PREFIX}${courseId}:${lessonId}`;
}

function isUIMessage(value: unknown): value is UIMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.role === "string" &&
    Array.isArray(m.parts)
  );
}

export function loadChatMessages(
  courseId: string,
  lessonId: string
): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(courseId, lessonId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUIMessage);
  } catch {
    return [];
  }
}

export function saveChatMessages(
  courseId: string,
  lessonId: string,
  messages: UIMessage[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(courseId, lessonId),
      JSON.stringify(messages)
    );
  } catch {
    // ignore quota / disabled storage
  }
}

export function clearChatMessages(courseId: string, lessonId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(courseId, lessonId));
  } catch {
    // ignore
  }
}
