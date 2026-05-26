import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/prompt";
import { markComplete } from "@/lib/progress";
import { getLesson, loadCourse } from "@/lib/syllabus";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatRequestBody = {
  messages: UIMessage[];
  courseId: string;
  lessonId: string;
};

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as ChatRequestBody;
  const { messages, courseId, lessonId } = body;

  if (!courseId || !lessonId) {
    return new Response("Missing courseId or lessonId", { status: 400 });
  }

  const course = await loadCourse(courseId);
  const lesson = getLesson(course, lessonId);
  const system = await buildSystemPrompt({ course, lesson });

  const result = streamText({
    model: openai("gpt-5.5"),
    system,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(4),
    tools: {
      complete_lesson: tool({
        description:
          "Mark the current lesson complete. Only call this after the learner has demonstrably met every mastery outcome for the lesson.",
        inputSchema: z.object({
          lessonId: z
            .string()
            .describe(
              "The id of the lesson being completed. Must equal the active lesson id."
            ),
          reason: z
            .string()
            .describe(
              "A single sentence naming the specific behaviours that convinced you the learner reached mastery."
            ),
        }),
        execute: async ({ lessonId: completedLessonId, reason }) => {
          if (completedLessonId !== lesson.id) {
            return {
              ok: false as const,
              error: `Tried to complete "${completedLessonId}" but the active lesson is "${lesson.id}".`,
            };
          }
          const next = await markComplete(courseId, lesson.id);
          return {
            ok: true as const,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            courseId: course.id,
            reason,
            completedLessonIds: next.completedLessonIds,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
