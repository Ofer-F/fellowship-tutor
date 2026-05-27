# Changes

A summary of the work added on top of the initial MVP (`Initial commit: AI tutor MVP`) on the `feature/ofer` branch.

## Overview

Three feature commits build on the original MVP:

1. **Fix chat layout and code block styling** (`71e0a98`)
2. **Add frontend syllabus picker** (`bca0416`)
3. **Add notes panel with summarize API** (`796fe03`)

Together they turn the single-course chat MVP into a multi-course tutor with a proper note-taking side panel, a smarter onboarding prompt, and a layout that behaves like a modern chat app.

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

## Files at a glance

| File | Status | Why |
| --- | --- | --- |
| `app/api/summarize/route.ts` | new | Summarize selected text into one bullet |
| `app/globals.css` | edit | Tailwind picks up Streamdown classes |
| `app/page.tsx` | edit | Honor `?courseId=...` and pass course list |
| `components/lesson-chat.tsx` | edit | Save-to-notes button, viewport-bound layout |
| `components/notes-panel.tsx` | new | Right-hand notes side panel |
| `components/sidebar.tsx` | edit | Syllabus dropdown |
| `components/tutor-shell.tsx` | edit | Course switching + notes state |
| `data/prompt.md` | edit | `__BEGIN__` onboarding, personalization, conversation rules |
| `data/syllabus/FE101.json` | new | Frontend Foundations course |
| `lib/notes.ts` | new | localStorage-backed notes module |
| `lib/syllabus.ts` | edit | `CourseSummary` + `listCourseSummaries()` |
| `pnpm-workspace.yaml` | edit | Concrete `allowBuilds` values |
