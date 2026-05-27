"use client";

import { Flame, Quote as QuoteIcon, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getCompletedToday,
  type DailyState,
} from "@/lib/daily-goal";
import type { Progress } from "@/lib/progress";
import { getDailyQuote } from "@/lib/quotes";
import type { StreakState } from "@/lib/streak";
import type { Course } from "@/lib/syllabus";

type MotivationBarProps = {
  course: Course;
  progress: Progress;
  streak: StreakState;
  daily: DailyState;
  learnerName: string | null;
  onCycleGoal: () => void;
};

export function MotivationBar({
  course,
  progress,
  streak,
  daily,
  learnerName,
  onCycleGoal,
}: MotivationBarProps) {
  const greeting = useGreeting(learnerName);
  const progressMessage = useProgressMessage(course, progress);
  const quote = useMemo(() => getDailyQuote(), []);
  const completedToday = getCompletedToday(daily);
  const goalReached = completedToday >= daily.goal;
  const goalPct = Math.min(
    100,
    Math.round((completedToday / daily.goal) * 100)
  );

  return (
    <>
      <div className="relative border-b-2 border-brand/30 bg-gradient-to-r from-orange-500/10 via-brand/12 to-brand/10 px-6 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                <Sparkles className="size-4 text-brand" />
                {greeting}
              </span>
              <span
                className="text-muted-foreground/50"
                aria-hidden="true"
              >
                ·
              </span>
              <span className="text-sm font-medium text-foreground/70">
                {progressMessage}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StreakChip streak={streak} />
              <GoalChip
                completedToday={completedToday}
                goal={daily.goal}
                goalPct={goalPct}
                reached={goalReached}
                onCycle={onCycleGoal}
              />
            </div>
          </div>
          <p className="flex items-center gap-2 text-xs italic leading-snug text-foreground/65">
            <QuoteIcon className="size-3.5 shrink-0 text-brand/70" />
            <span>
              &ldquo;{quote.text}&rdquo;{" "}
              <span className="not-italic text-foreground/50">
                — {quote.author}
              </span>
            </span>
          </p>
        </div>
      </div>

      <StreakRail
        streak={streak}
        className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 min-[1700px]:flex"
      />
      <GoalRail
        completedToday={completedToday}
        goal={daily.goal}
        goalPct={goalPct}
        reached={goalReached}
        onCycle={onCycleGoal}
        className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 min-[1700px]:flex"
      />
    </>
  );
}

function StreakChip({ streak }: { streak: StreakState }) {
  if (streak.currentStreak <= 0) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-full border border-muted-foreground/20 bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
        title="Visit the app daily to start a streak"
      >
        <Flame className="size-3.5" />
        Start streak
      </div>
    );
  }
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/15 px-2.5 py-1 text-xs font-bold tracking-tight text-orange-600 shadow-sm dark:text-orange-300"
      title={`Longest streak: ${streak.longestStreak} day${streak.longestStreak === 1 ? "" : "s"}`}
    >
      <Flame className="size-3.5" />
      {streak.currentStreak}-day streak
    </div>
  );
}

function GoalChip({
  completedToday,
  goal,
  goalPct,
  reached,
  onCycle,
}: {
  completedToday: number;
  goal: number;
  goalPct: number;
  reached: boolean;
  onCycle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCycle}
      title="Click to change today's goal"
      className={cn(
        "group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1 text-xs font-bold tracking-tight shadow-sm transition-colors",
        reached
          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "border-brand/30 bg-brand/10 text-brand hover:bg-brand/15"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 transition-[width]",
          reached ? "bg-emerald-500/25" : "bg-brand/20"
        )}
        style={{ width: `${goalPct}%` }}
      />
      <Target className="relative size-3.5" />
      <span className="relative">
        Today {completedToday}/{goal}
      </span>
    </button>
  );
}

function StreakRail({
  streak,
  className,
}: {
  streak: StreakState;
  className?: string;
}) {
  if (streak.currentStreak <= 0) {
    return (
      <aside
        className={cn(
          "w-[96px] flex-col items-center gap-1.5 rounded-2xl border border-dashed border-muted-foreground/30 bg-card/60 px-3 py-5 text-center shadow-md backdrop-blur",
          className
        )}
        aria-label="Start a streak"
      >
        <Flame className="size-7 text-muted-foreground/60" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Start a streak
        </p>
        <p className="text-[10px] leading-tight text-muted-foreground/70">
          Visit daily to build it
        </p>
      </aside>
    );
  }
  return (
    <aside
      className={cn(
        "w-[96px] flex-col items-center gap-1 rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-500/20 via-orange-500/10 to-amber-500/5 px-3 py-5 text-center shadow-lg backdrop-blur",
        className
      )}
      aria-label={`${streak.currentStreak} day streak`}
    >
      <Flame className="size-7 animate-pulse text-orange-500" />
      <div className="text-4xl font-extrabold leading-none tracking-tight text-foreground tabular-nums">
        {streak.currentStreak}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
        day streak
      </div>
      {streak.longestStreak > streak.currentStreak && (
        <div className="mt-1 text-[9px] font-medium text-muted-foreground">
          best: {streak.longestStreak}
        </div>
      )}
    </aside>
  );
}

function GoalRail({
  completedToday,
  goal,
  goalPct,
  reached,
  onCycle,
  className,
}: {
  completedToday: number;
  goal: number;
  goalPct: number;
  reached: boolean;
  onCycle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onCycle}
      title="Click to change today's goal"
      className={cn(
        "w-[96px] flex-col items-center gap-1 rounded-2xl border px-3 py-5 text-center shadow-lg backdrop-blur transition-colors",
        reached
          ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 hover:from-emerald-500/25"
          : "border-brand/30 bg-gradient-to-b from-brand/20 via-brand/10 to-brand/5 hover:from-brand/25",
        className
      )}
      aria-label={`Today's goal: ${completedToday} of ${goal}`}
    >
      <Target
        className={cn(
          "size-7",
          reached ? "text-emerald-500" : "text-brand"
        )}
      />
      <div className="text-3xl font-extrabold leading-none tracking-tight text-foreground tabular-nums">
        {completedToday}
        <span className="text-xl font-bold text-muted-foreground">
          /{goal}
        </span>
      </div>
      <div
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          reached ? "text-emerald-700 dark:text-emerald-300" : "text-brand"
        )}
      >
        today&apos;s goal
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all",
            reached ? "bg-emerald-500" : "bg-brand"
          )}
          style={{ width: `${goalPct}%` }}
        />
      </div>
      <p className="mt-1 text-[9px] text-muted-foreground">tap to change</p>
    </button>
  );
}

function useGreeting(name: string | null): string {
  const [greeting, setGreeting] = useState<string>(() =>
    composeGreeting(null, new Date().getHours())
  );
  useEffect(() => {
    setGreeting(composeGreeting(name, new Date().getHours()));
  }, [name]);
  return greeting;
}

function composeGreeting(name: string | null, hour: number): string {
  let timeGreeting: string;
  if (hour < 5) timeGreeting = "Working late";
  else if (hour < 12) timeGreeting = "Good morning";
  else if (hour < 17) timeGreeting = "Good afternoon";
  else if (hour < 22) timeGreeting = "Good evening";
  else timeGreeting = "Burning the midnight oil";
  return name ? `${timeGreeting}, ${name}` : `${timeGreeting}`;
}

function useProgressMessage(course: Course, progress: Progress): string {
  return useMemo(() => {
    const total = course.lessons.length;
    const done = progress.completedLessonIds.length;
    if (total === 0) return "Your course is ready. Dive in.";
    if (done === 0) return "Day one — your tutor is right here.";
    if (done === total) return "Course mastered. Take a victory lap.";
    const pct = done / total;
    if (pct < 0.3)
      return `${done} of ${total} mastered — momentum is on your side.`;
    if (pct < 0.7)
      return `${done} of ${total} mastered — you're past the hump.`;
    const left = total - done;
    return `${left} ${left === 1 ? "lesson" : "lessons"} between you and the finish line.`;
  }, [course.lessons.length, progress.completedLessonIds.length]);
}
