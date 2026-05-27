# Changes

A summary of the work added on top of the initial MVP (`Initial commit: AI tutor MVP`) on the `feature/ofer` branch.

## Overview

Four feature commits build on the original MVP, plus one in-progress feature still uncommitted:

1. **Fix chat layout and code block styling** (`71e0a98`)
2. **Add frontend syllabus picker** (`bca0416`)
3. **Add notes panel with summarize API** (`796fe03`)
4. **Add multi-course support and enhanced note-taking features** (`488b533`)
5. **Motivation bar with streak, daily goal, and learner name** *(uncommitted, in progress)*

Together they turn the single-course chat MVP into a multi-course tutor with a proper note-taking side panel, persistent per-lesson chat history, smarter summarization, and a top motivation bar that personalizes the experience with streak tracking, a daily goal, and a daily quote.

## 1. Chat layout & code block styling

**Commit:** `71e0a98`

Keep the lesson chat constrained to the viewport so messages scroll like a real chat, and make sure Streamdown-rendered code blocks pick up Tailwind classes.

- `app/globals.css` — added `@source "../node_modules/streamdown/dist";` so Tailwind scans Streamdown's generated classes and code blocks render with the right styles.
- `components/tutor-shell.tsx` — outer container switched from `min-h-svh` to `h-svh overflow-hidden`, and `<main>` gets `min-w-0` so the chat column can shrink instead of overflowing.
- `components/lesson-chat.tsx` — internal layout reworked so the message list scrolls inside a fixed-height column instead of growing the page.

## 2. Frontend syllabus picker

**Commit:** `bca0416`

Let learners switch between any course JSON file in `data/syllabus/` directly from the sidebar.

### New course

- `data/syllabus/FE101.json` — **Frontend Foundations**, a TypeScript + React syllabus for Masterschool's internal engineers Bootcamp, ending with a Frontend Chat MVP that the Backend course plugs into in Week 3.

### Syllabus loading

- `lib/syllabus.ts`
  - Added `CourseSummary = Pick<Course, "id" | "title" | "description">`.
  - Added `listCourseSummaries()` which loads every course in `data/syllabus/` and returns them sorted by title.

### Page wiring

- `app/page.tsx`
  - Reads `?courseId=...` from `searchParams` and validates it against the available course list (falls back to `PY101`).
  - Loads progress for the *selected* course (not always the default).
  - Passes `availableCourses` into `TutorShell`.

### UI

- `components/sidebar.tsx`
  - New `Syllabus` dropdown (shadcn `Select`) above the course title; switching it calls `onSelectCourse`.
- `components/tutor-shell.tsx`
  - Uses `useRouter()` to navigate to `/?courseId=<id>` when a new course is picked.
  - Wraps the shell with `key={course.id}` so internal state (active lesson, notes, etc.) resets cleanly on course change.

### Build config

- `pnpm-workspace.yaml` — flipped `msw`, `sharp`, and `unrs-resolver` from placeholder strings to real `true` values so `pnpm install` stops nagging.

## 3. Notes panel + `/api/summarize`

**Commit:** `796fe03`

A right-hand notes panel with one-click "save to notes" from any assistant message, optionally summarized to a single bullet by GPT.

### New API route

- `app/api/summarize/route.ts` — `POST /api/summarize`
  - Accepts `{ text }` and returns `{ summary }`.
  - Uses `generateText` from the AI SDK with `openai("gpt-5.5")` and a strict system prompt that forces: one sentence, ≤25 words, plain text, no markdown, preserve technical terms verbatim, no invented facts.
  - Returns `400` on bad input and `500` on model failure.

### Notes storage

- `lib/notes.ts` — new module.
  - `Note` type (`id`, `text`, `lessonId`, `lessonTitle`, `createdAt`).
  - `loadNotes(courseId)` / `saveNotes(courseId, notes)` backed by `localStorage` under the key `fellowship-tutor:notes:<courseId>`.
  - `createNoteId()` helper using `crypto.randomUUID()` with a Math-based fallback.
  - SSR-safe (no-ops when `window` is undefined) and tolerant of corrupted JSON / disabled storage.

### Notes UI

- `components/notes-panel.tsx` — new right-hand panel.
  - Open state: header with count + clear-all, scrollable list of notes (text, lesson title, "Jump to lesson", copy, delete), and a collapse button.
  - Closed state: a narrow `CollapsedStrip` with the unread count and an expand button.
- `components/tutor-shell.tsx`
  - Owns `notes` state, persisted per course via `loadNotes` / `saveNotes`.
  - Handlers: `handleSaveNote`, `handleRemoveNote`, `handleClearNotes`, `toggleNotes`.
  - Auto-opens the panel when a new note is saved.
- `components/lesson-chat.tsx`
  - New `onSaveNote` prop wired through to each assistant message.
  - A "Save to notes" button (with tooltip "highlight text first for a quick bullet") appears on assistant messages.
  - If the user has selected text inside the message, that selection is sent; otherwise the full message text is sent.
  - Selected text is summarized via `POST /api/summarize` before being saved; if summarization fails, an inline error is shown and the raw text can still be saved.

### Prompt overhaul

- `data/prompt.md` — major upgrade to the tutor system prompt:
  - **`__BEGIN__` opening protocol.** The chat starts with a hidden `__BEGIN__` user message; the tutor opens the conversation first with a warm greeting, names the course/lesson, and asks 1–2 "about you" questions. It must never echo or reveal the `__BEGIN__` signal.
  - **Two-step onboarding.** After the learner answers, the next assistant message reflects back what they said, presents a friendly lesson agenda (derived from outcomes), explains *why this lesson matters* tied to their goals, and ends with one open question.
  - **"Get to know the learner" section.** Encourages remembering name/role/goals/analogies and reusing them; forbids inventing facts about the learner.
  - **"Holding a real conversation" section.** Multi-question messages must be answered one-at-a-time with an explicit "is #1 resolved?" check; keep an internal queue of follow-ups; welcome in-scope tangents, gently steer out-of-scope ones; mirror the learner's depth.
  - **Tone.** Use the learner's name occasionally once shared, but don't overdo it.
  - **Hard rules added at the bottom.** Never batch-answer multiple questions; never reveal or echo `__BEGIN__`.

## 4. Persistent chat, two-mode summarize, lesson-grouped notes

**Commit:** `488b533`

Polish pass on the note-taking flow: per-lesson chat history survives navigation, summarization now has a "specific" *and* a "general" mode, and the notes panel can be grouped by lesson with a deterministic color per lesson.

### Persistent chat history

- `lib/chat-storage.ts` — new module.
  - `loadChatMessages(courseId, lessonId)` / `saveChatMessages(...)` / `clearChatMessages(...)`, backed by `localStorage` under `fellowship-tutor:chat:<courseId>:<lessonId>`.
  - SSR-safe; tolerates corrupted JSON; filters out anything that isn't a valid `UIMessage`.
- `components/lesson-chat.tsx`
  - `useChat` is seeded from `loadChatMessages(course.id, lesson.id)` on mount, so reopening a lesson restores the conversation.
  - After each assistant turn (when `status === "ready"`), the full transcript is persisted.

### Two-mode summarize ("specific" vs "general")

- `app/api/summarize/route.ts`
  - Accepts an optional `mode: "specific" | "general"` in the request body.
  - **Specific** keeps the concrete example, variable names, and project context, up to ~25 words.
  - **General** strips the example and phrases the takeaway as a portable rule of thumb — keeps only concept names and required technical terminology.
  - Both modes share a new formatting rule set: a single sentence, **bold** for the 1–2 most important phrases, `` `backticks` `` for code identifiers, no headings/lists/links, no invented facts.
- `components/lesson-chat.tsx`
  - The save-to-notes editor now exposes two buttons: "As a short sentence" (`Sparkles`) and "As a general note" (`Lightbulb`), each independently loadable.
  - `summarizingAs` state tracks which mode is in-flight so only that button shows the spinner.

### Notes panel: group-by-lesson + lesson colors

- `lib/notes.ts`
  - Added `LessonColor` type plus a palette of 8 colorways (`border`, `chipBg`, `chipText`, `dot`) covering amber/emerald/sky/violet/rose/teal/orange/indigo for light + dark mode.
  - `getLessonColor(lessonId)` hashes the lesson id and picks a stable color from the palette.
- `components/notes-panel.tsx`
  - New `GroupModeToggle` (Recent / By lesson) at the top of the panel.
  - In **By lesson** mode, notes are grouped under a `LessonGroup` header with the lesson's color dot, title, and count.
  - `NoteCard` now uses the lesson color for a left border accent and a colored chip showing the lesson title (hidden inside `LessonGroup` to avoid duplication).
  - Note bodies render through `MessageResponse` (Streamdown) so the **bold** / `code` formatting produced by the summarizer actually shows up.

## 5. Motivation bar: streak, daily goal, daily quote, learner-name detection

*Uncommitted as of writing — files are new/modified in the working tree but not yet committed.*

A top "motivation" strip above the chat that personalizes the experience: time-of-day greeting (with the learner's name once known), a progress-aware nudge, a visit streak, an adjustable daily lesson goal, and a daily quote.

### New component

- `components/motivation-bar.tsx` — new top strip.
  - Time-of-day greeting (`Good morning` / `Good afternoon` / `Good evening` / `Working late` / `Burning the midnight oil`), with the learner's name appended once detected.
  - Progress-aware message based on `completedLessonIds.length / lessons.length` (e.g. "Day one — your tutor is right here.", "you're past the hump.", "1 lesson between you and the finish line.").
  - `StreakChip` — flame icon + current streak, or a "Start streak" pill when none yet.
  - `GoalChip` — clickable progress pill ("Today 2/3") that cycles through `[1, 2, 3, 5]` goal options; fills with brand color, turns emerald when the goal is hit.
  - `QuoteIcon` line with a deterministic daily quote pulled from `lib/quotes.ts`.

### New state modules

- `lib/streak.ts`
  - `StreakState` = `{ lastVisit, currentStreak, longestStreak }`.
  - `loadStreak()` and `recordVisit(date?)` stored under `fellowship-tutor:streak`.
  - Gap of `1` day → increment; same day → no-op; larger gap → reset to 1. Tracks `longestStreak` automatically.
- `lib/daily-goal.ts`
  - `DailyState` = `{ goal, completionsByDate: Record<isoDate, count> }`, stored per course at `fellowship-tutor:daily:<courseId>`.
  - `loadDailyState` / `saveDailyState` (validating shape, SSR-safe, quota-tolerant).
  - `getCompletedToday(state)`, `recordLessonCompletionToday(courseId, state)`, and `cycleDailyGoal(courseId, state)` over `GOAL_OPTIONS = [1, 2, 3, 5]`.
- `lib/quotes.ts`
  - 30 hand-picked learning/practice quotes (Mandela, Edison, B.B. King, Yeats, Plutarch, Alan Kay, etc.).
  - `getDailyQuote(date?)` returns a deterministic quote based on `(dayOfYear + year) % QUOTES.length` so it changes daily but is stable across renders.
- `lib/learner-profile.ts`
  - `loadLearnerName(courseId)` / `saveLearnerName(courseId, name)` stored at `fellowship-tutor:learner:<courseId>`.
  - `extractLearnerName(messages)` scans user messages for patterns like `I'm Ofer`, `my name is Ofer`, `call me Ofer`, `this is Ofer`, then filters out common false positives ("just", "trying", "learning", "ready", …) and title-cases the result. Skips the `__BEGIN__` signal message.

### Wiring

- `components/tutor-shell.tsx`
  - Mounts `<MotivationBar>` above `<LessonChat>` inside the main column.
  - On mount: `setStreak(recordVisit())`. On course change: `setDaily(loadDailyState(course.id))` and `setLearnerName(loadLearnerName(course.id))`.
  - `handleCycleGoal` calls `cycleDailyGoal` and updates state.
  - `handleLearnerNameDetected(name)` saves the first detected name per course and ignores subsequent re-detections.
  - `handleLessonCompleted` now also calls `recordLessonCompletionToday(course.id, prev)` so the goal chip ticks up when a lesson is finished.
- `components/lesson-chat.tsx`
  - New optional `onLearnerNameDetected` prop.
  - After each message change, runs `extractLearnerName(messages)` and fires the callback with the first plausible name found.

## Files at a glance

| File | Status | Why |
| --- | --- | --- |
| `app/api/summarize/route.ts` | new + edit | Summarize selected text; now supports `specific` vs `general` modes with bold/code formatting |
| `app/globals.css` | edit | Tailwind picks up Streamdown classes |
| `app/page.tsx` | edit | Honor `?courseId=...` and pass course list |
| `components/lesson-chat.tsx` | edit | Save-to-notes button, viewport-bound layout, persistent chat history, two-mode summarize, learner-name detection |
| `components/motivation-bar.tsx` | new *(uncommitted)* | Top strip: greeting, progress nudge, streak, daily goal, daily quote |
| `components/notes-panel.tsx` | new + edit | Right-hand notes side panel with Recent / By-lesson grouping and per-lesson colors |
| `components/sidebar.tsx` | edit | Syllabus dropdown |
| `components/tutor-shell.tsx` | edit | Course switching, notes state, motivation bar wiring (streak / daily goal / learner name) |
| `data/prompt.md` | edit | `__BEGIN__` onboarding, personalization, conversation rules |
| `data/syllabus/FE101.json` | new | Frontend Foundations course |
| `lib/chat-storage.ts` | new | localStorage-backed per-lesson chat history |
| `lib/daily-goal.ts` | new *(uncommitted)* | Per-course daily goal + lesson-completion-today tracking |
| `lib/learner-profile.ts` | new *(uncommitted)* | Detect & persist the learner's name from chat messages |
| `lib/notes.ts` | new + edit | localStorage-backed notes module + per-lesson color palette |
| `lib/quotes.ts` | new *(uncommitted)* | Daily-quote carousel |
| `lib/streak.ts` | new *(uncommitted)* | Daily-visit streak tracking |
| `lib/syllabus.ts` | edit | `CourseSummary` + `listCourseSummaries()` |
| `pnpm-workspace.yaml` | edit | Concrete `allowBuilds` values |
