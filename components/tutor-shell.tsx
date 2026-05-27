"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LessonChat } from "@/components/lesson-chat";
import { NotesPanel } from "@/components/notes-panel";
import { Sidebar } from "@/components/sidebar";
import {
  createNoteId,
  loadNotes,
  type Note,
  saveNotes,
} from "@/lib/notes";
import type { Progress } from "@/lib/progress";
import type { Course, CourseSummary } from "@/lib/syllabus";

type TutorShellProps = {
  availableCourses: CourseSummary[];
  course: Course;
  initialProgress: Progress;
};

function firstIncompleteLessonId(course: Course, progress: Progress): string {
  const completed = new Set(progress.completedLessonIds);
  const next = course.lessons.find((l) => !completed.has(l.id));
  return next?.id ?? course.lessons[course.lessons.length - 1]?.id ?? "";
}

export function TutorShell({
  availableCourses,
  course,
  initialProgress,
}: TutorShellProps) {
  return (
    <TutorShellInner
      key={course.id}
      availableCourses={availableCourses}
      course={course}
      initialProgress={initialProgress}
    />
  );
}

function TutorShellInner({
  availableCourses,
  course,
  initialProgress,
}: TutorShellProps) {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [activeLessonId, setActiveLessonId] = useState<string>(() =>
    firstIncompleteLessonId(course, initialProgress)
  );
  const [notes, setNotes] = useState<Note[]>([]);
  const [hasLoadedNotes, setHasLoadedNotes] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(true);

  useEffect(() => {
    setNotes(loadNotes(course.id));
    setHasLoadedNotes(true);
  }, [course.id]);

  useEffect(() => {
    if (!hasLoadedNotes) return;
    saveNotes(course.id, notes);
  }, [course.id, hasLoadedNotes, notes]);

  const handleSaveNote = useCallback(
    (text: string, lessonId: string, lessonTitle: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setNotes((prev) => [
        {
          id: createNoteId(),
          text: trimmed,
          lessonId,
          lessonTitle,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
      setIsNotesOpen(true);
    },
    []
  );

  const handleRemoveNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleClearNotes = useCallback(() => {
    setNotes([]);
  }, []);

  const toggleNotes = useCallback(() => {
    setIsNotesOpen((prev) => !prev);
  }, []);

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

  const handleCourseSelect = useCallback(
    (courseId: string) => {
      if (courseId === course.id) return;
      router.push(`/?courseId=${encodeURIComponent(courseId)}`);
    },
    [course.id, router]
  );

  const activeLesson = useMemo(
    () =>
      course.lessons.find((l) => l.id === activeLessonId) ?? course.lessons[0],
    [activeLessonId, course.lessons]
  );

  return (
    <div className="flex h-svh overflow-hidden">
      <Sidebar
        availableCourses={availableCourses}
        course={course}
        progress={progress}
        activeLessonId={activeLesson.id}
        onSelectCourse={handleCourseSelect}
        onSelectLesson={goToLesson}
      />
      <main className="tutor-backdrop relative flex min-w-0 flex-1 flex-col">
        <LessonChat
          key={activeLesson.id}
          course={course}
          lesson={activeLesson}
          isAlreadyCompleted={progress.completedLessonIds.includes(
            activeLesson.id
          )}
          onLessonCompleted={handleLessonCompleted}
          onAdvance={goToLesson}
          onSaveNote={(text) =>
            handleSaveNote(text, activeLesson.id, activeLesson.title)
          }
        />
      </main>
      <NotesPanel
        notes={notes}
        isOpen={isNotesOpen}
        onToggle={toggleNotes}
        onRemoveNote={handleRemoveNote}
        onClearAll={handleClearNotes}
        onJumpToLesson={goToLesson}
      />
    </div>
  );
}
