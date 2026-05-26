"use client";

import {
  CheckCircle2,
  GraduationCap,
  Lock,
  Sparkles,
} from "lucide-react";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Progress } from "@/lib/progress";
import type { Course, Lesson } from "@/lib/syllabus";

type LessonStatus = "completed" | "current" | "locked" | "available";

function lessonStatus(
  course: Course,
  lesson: Lesson,
  progress: Progress,
  activeLessonId: string
): LessonStatus {
  if (progress.completedLessonIds.includes(lesson.id)) return "completed";
  if (lesson.id === activeLessonId) return "current";
  const lessonIndex = course.lessons.findIndex((l) => l.id === lesson.id);
  const activeIndex = course.lessons.findIndex((l) => l.id === activeLessonId);
  if (lessonIndex < activeIndex) return "available";
  return "locked";
}

type SidebarProps = {
  course: Course;
  progress: Progress;
  activeLessonId: string;
  onSelectLesson: (lessonId: string) => void;
};

export function Sidebar({
  course,
  progress,
  activeLessonId,
  onSelectLesson,
}: SidebarProps) {
  const total = course.lessons.length;
  const done = progress.completedLessonIds.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
      <div className="space-y-4 border-b border-border px-6 pt-7 pb-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <GraduationCap className="size-4" />
          Fellowship Tutor
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight tracking-tight">
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {done} of {total} complete
            </span>
            <span className="font-medium text-foreground">{pct}%</span>
          </div>
          <ProgressBar
            value={pct}
            className="h-1.5 bg-muted [&>div]:bg-brand"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <ol className="space-y-1 px-3 py-4">
          {course.lessons.map((lesson, idx) => {
            const status = lessonStatus(
              course,
              lesson,
              progress,
              activeLessonId
            );
            const isClickable = status !== "locked";

            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onSelectLesson(lesson.id)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg p-3 text-left transition-all",
                    isClickable
                      ? "cursor-pointer hover:bg-muted"
                      : "cursor-not-allowed opacity-55",
                    status === "current" &&
                      "bg-brand/8 ring-1 ring-brand/30 hover:bg-brand/12"
                  )}
                >
                  <StatusIcon status={status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "shrink-0 text-xs font-mono",
                          status === "current"
                            ? "text-brand"
                            : "text-muted-foreground"
                        )}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "truncate text-sm font-medium leading-tight",
                          status === "current" && "text-foreground",
                          status === "completed" && "text-foreground/80",
                          status === "locked" && "text-muted-foreground"
                        )}
                      >
                        {lesson.title}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "mt-1 ml-7 text-[11px] font-medium uppercase tracking-wide",
                        status === "completed"
                          ? "text-success"
                          : "text-muted-foreground"
                      )}
                    >
                      {status === "completed"
                        ? "Mastered"
                        : `${lesson.outcomes.length} outcome${lesson.outcomes.length === 1 ? "" : "s"}`}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </ScrollArea>

      <div className="border-t border-border px-6 py-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Edit{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            data/prompt.md
          </code>{" "}
          to change how the tutor teaches. Saves take effect on the next turn.
        </p>
      </div>
    </aside>
  );
}

function StatusIcon({ status }: { status: LessonStatus }) {
  if (status === "completed") {
    return (
      <CheckCircle2
        className="mt-0.5 size-4 shrink-0 text-success"
        aria-label="Completed"
      />
    );
  }
  if (status === "current") {
    return (
      <span className="relative mt-0.5 inline-flex size-4 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
        <Sparkles
          className="relative size-4 text-brand"
          aria-label="Current lesson"
        />
      </span>
    );
  }
  if (status === "locked") {
    return (
      <Lock
        className="mt-0.5 size-4 shrink-0 text-muted-foreground/60"
        aria-label="Locked"
      />
    );
  }
  return (
    <span
      className="mt-0.5 size-4 shrink-0 rounded-full border border-muted-foreground/40"
      aria-label="Available"
    />
  );
}
