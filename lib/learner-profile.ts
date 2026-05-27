import type { UIMessage } from "ai";

const STORAGE_PREFIX = "fellowship-tutor:learner:";

function storageKey(courseId: string): string {
  return `${STORAGE_PREFIX}${courseId}`;
}

export function loadLearnerName(courseId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(storageKey(courseId));
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function saveLearnerName(courseId: string, name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(courseId), name);
  } catch {
    // ignore quota
  }
}

const NAME_PATTERNS: RegExp[] = [
  /\b(?:i am|i['’]m|im|my name is|name['’]s|name is)\s+([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})?)/,
  /\bcall me\s+([A-Z][a-z]{1,20})/,
  /\bthis is\s+([A-Z][a-z]{1,20})/,
];

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "just",
  "trying",
  "learning",
  "new",
  "working",
  "building",
  "studying",
  "looking",
  "hoping",
  "really",
  "very",
  "here",
  "back",
  "fine",
  "good",
  "okay",
  "ready",
  "excited",
  "interested",
]);

function isPlausibleName(candidate: string): boolean {
  if (!candidate) return false;
  if (candidate.length < 2 || candidate.length > 40) return false;
  const tokens = candidate.split(/\s+/);
  for (const token of tokens) {
    if (STOP_WORDS.has(token.toLowerCase())) return false;
    if (!/^[A-Za-z][a-zA-Z'’-]*$/.test(token)) return false;
  }
  return true;
}

export function extractLearnerName(messages: UIMessage[]): string | null {
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    for (const part of msg.parts) {
      if (part.type !== "text") continue;
      const text = part.text;
      if (!text || text === "__BEGIN__") continue;
      for (const pattern of NAME_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const candidate = match[1].trim();
          if (isPlausibleName(candidate)) {
            return candidate
              .split(/\s+/)
              .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
              .join(" ");
          }
        }
      }
    }
  }
  return null;
}
