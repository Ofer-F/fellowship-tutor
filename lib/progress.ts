import { promises as fs } from "node:fs";
import path from "node:path";
import type { Course } from "./syllabus";

export type Progress = {
  completedLessonIds: string[];
  updatedAt: string;
};

const PROGRESS_DIR = path.join(process.cwd(), "data", "progress");

function progressPath(courseId: string): string {
  return path.join(PROGRESS_DIR, `${courseId}.json`);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(PROGRESS_DIR, { recursive: true });
}

export async function readProgress(courseId: string): Promise<Progress> {
  await ensureDir();
  const filePath = progressPath(courseId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      completedLessonIds: Array.isArray(parsed.completedLessonIds)
        ? parsed.completedLessonIds
        : [],
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { completedLessonIds: [], updatedAt: new Date(0).toISOString() };
    }
    throw err;
  }
}

export async function markComplete(
  courseId: string,
  lessonId: string
): Promise<Progress> {
  await ensureDir();
  const current = await readProgress(courseId);
  if (current.completedLessonIds.includes(lessonId)) {
    return current;
  }
  const next: Progress = {
    completedLessonIds: [...current.completedLessonIds, lessonId],
    updatedAt: new Date().toISOString(),
  };
  const filePath = progressPath(courseId);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);
  return next;
}

export function currentLessonId(
  course: Course,
  progress: Progress
): string | null {
  const completed = new Set(progress.completedLessonIds);
  const next = course.lessons.find((l) => !completed.has(l.id));
  return next ? next.id : null;
}
