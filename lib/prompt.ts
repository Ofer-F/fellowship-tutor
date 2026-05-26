import { promises as fs } from "node:fs";
import path from "node:path";
import type { Course, Lesson } from "./syllabus";

const PROMPT_PATH = path.join(process.cwd(), "data", "prompt.md");

export async function buildSystemPrompt(args: {
  course: Course;
  lesson: Lesson;
}): Promise<string> {
  const template = await fs.readFile(PROMPT_PATH, "utf8");
  const outcomes = args.lesson.outcomes
    .map((o, i) => `${i + 1}. ${o}`)
    .join("\n");

  return template
    .replaceAll("{{courseTitle}}", args.course.title)
    .replaceAll("{{lessonTitle}}", args.lesson.title)
    .replaceAll("{{lessonOutcomes}}", outcomes);
}
