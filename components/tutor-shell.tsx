"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LessonChat } from "@/components/lesson-chat";
import { Sidebar } from "@/components/sidebar";
import type { Progress } from "@/lib/progress";
import type { Course } from "@/lib/syllabus";

type TutorShellProps = {
  course: Course;
  initialProgress: Progress;
};

function firstIncompleteLessonId(course: Course, progress: Progress): string {
  const completed = new Set(progress.completedLessonIds);
  const next = course.lessons.find((l) => !completed.has(l.id));
  return next?.id ?? course.lessons[course.lessons.length - 1]?.id ?? "";
}

export function TutorShell({ course, initialProgress }: TutorShellProps) {
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [activeLessonId, setActiveLessonId] = useState<string>(() =>
    firstIncompleteLessonId(course, initialProgress)
  );

  const refreshProgress = useCallback(async (): Promise<Progress> => {
    const res = await fetch(
      `/api/progress?courseId=${encodeURIComponent(course.id)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return progress;
    const next = (await res.json()) as Progress;
    setProgress(next);
    return next;
  }, [course.id, progress]);

  const handleLessonCompleted = useCallback(
    async (completedLessonId: string) => {
      const updated = await refreshProgress();
      const currentIndex = course.lessons.findIndex(
        (l) => l.id === completedLessonId
      );
      const next = course.lessons[currentIndex + 1];
      if (
        next &&
        !updated.completedLessonIds.includes(next.id) &&
        activeLessonId === completedLessonId
      ) {
        return next.id;
      }
      return null;
    },
    [activeLessonId, course.lessons, refreshProgress]
  );

  const goToLesson = useCallback((lessonId: string) => {
    setActiveLessonId(lessonId);
  }, []);

  const activeLesson = useMemo(
    () =>
      course.lessons.find((l) => l.id === activeLessonId) ?? course.lessons[0],
    [activeLessonId, course.lessons]
  );

  // Keep state in sync if the server-rendered progress changes (e.g. HMR)
  useEffect(() => {
    setProgress(initialProgress);
  }, [initialProgress]);

  return (
    <div className="flex min-h-svh">
      <Sidebar
        course={course}
        progress={progress}
        activeLessonId={activeLesson.id}
        onSelectLesson={goToLesson}
      />
      <main className="tutor-backdrop relative flex flex-1 flex-col">
        <LessonChat
          key={activeLesson.id}
          course={course}
          lesson={activeLesson}
          isAlreadyCompleted={progress.completedLessonIds.includes(
            activeLesson.id
          )}
          onLessonCompleted={handleLessonCompleted}
          onAdvance={goToLesson}
        />
      </main>
    </div>
  );
}
