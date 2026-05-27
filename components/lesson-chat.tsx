"use client";

import {
  DefaultChatTransport,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import { useChat } from "@ai-sdk/react";
import {
  ArrowRight,
  BookmarkPlus,
  BookOpen,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Course, Lesson } from "@/lib/syllabus";

const BEGIN_SIGNAL = "__BEGIN__";

function isBeginSignalMessage(message: UIMessage): boolean {
  if (message.role !== "user") return false;
  return message.parts.every(
    (part) => part.type === "text" && part.text === BEGIN_SIGNAL
  );
}

type CompleteLessonOutput = {
  ok: boolean;
  lessonId?: string;
  lessonTitle?: string;
  courseId?: string;
  reason?: string;
  error?: string;
};

function findCompletionPart(messages: UIMessage[]): {
  output: CompleteLessonOutput;
  toolCallId: string;
} | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      const toolPart = part as ToolUIPart;
      if (
        toolPart.type === "tool-complete_lesson" &&
        toolPart.state === "output-available"
      ) {
        const output = toolPart.output as CompleteLessonOutput;
        if (output?.ok) {
          return { output, toolCallId: toolPart.toolCallId };
        }
      }
    }
  }
  return null;
}

type LessonChatProps = {
  course: Course;
  lesson: Lesson;
  isAlreadyCompleted: boolean;
  onLessonCompleted: (lessonId: string) => Promise<string | null>;
  onAdvance: (lessonId: string) => void;
  onSaveNote: (text: string) => void;
};

export function LessonChat({
  course,
  lesson,
  isAlreadyCompleted,
  onLessonCompleted,
  onAdvance,
  onSaveNote,
}: LessonChatProps) {
  const [input, setInput] = useState("");
  const [nextLessonId, setNextLessonId] = useState<string | null>(null);
  const handledCompletionRef = useRef<string | null>(null);
  const hasAutoStartedRef = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { courseId: course.id, lessonId: lesson.id },
      }),
    [course.id, lesson.id]
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
  });

  const completion = findCompletionPart(messages);
  const isComplete = isAlreadyCompleted || completion !== null;
  const isStreaming = status === "submitted" || status === "streaming";

  const visibleMessages = useMemo(
    () => messages.filter((m) => !isBeginSignalMessage(m)),
    [messages]
  );

  useEffect(() => {
    if (!completion) return;
    const key = completion.toolCallId;
    if (handledCompletionRef.current === key) return;
    handledCompletionRef.current = key;
    onLessonCompleted(lesson.id).then((next) => {
      setNextLessonId(next);
    });
  }, [completion, lesson.id, onLessonCompleted]);

  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    if (isAlreadyCompleted) return;
    if (messages.length > 0) return;
    if (isStreaming) return;
    hasAutoStartedRef.current = true;
    sendMessage({ text: BEGIN_SIGNAL });
  }, [isAlreadyCompleted, isStreaming, messages.length, sendMessage]);

  const handleSubmit = useCallback(
    (msg: PromptInputMessage) => {
      const text = msg.text.trim();
      if (!text || isStreaming || isComplete) return;
      sendMessage({ text });
      setInput("");
    },
    [isComplete, isStreaming, sendMessage]
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <LessonHeader course={course} lesson={lesson} />

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-6 py-8">
          {visibleMessages.length === 0 ? (
            isAlreadyCompleted ? (
              <CompletedEmptyState lesson={lesson} />
            ) : (
              <PreparingState lesson={lesson} />
            )
          ) : (
            visibleMessages.map((message) => (
              <MessageView
                key={message.id}
                message={message}
                onSaveNote={onSaveNote}
              />
            ))
          )}

          {completion && (
            <CompletionCard
              output={completion.output}
              nextLesson={
                nextLessonId
                  ? course.lessons.find((l) => l.id === nextLessonId) ?? null
                  : null
              }
              onAdvance={onAdvance}
            />
          )}

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Something went wrong. {error.message}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="relative border-t border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {isStreaming && (
          <div className="tutor-stream-bar absolute inset-x-0 top-0 h-px" />
        )}
        <div className="mx-auto w-full max-w-3xl px-6 py-4">
          {isComplete ? (
            <LockedInputNotice
              nextLesson={
                nextLessonId
                  ? course.lessons.find((l) => l.id === nextLessonId) ?? null
                  : null
              }
              onAdvance={onAdvance}
              alreadyCompletedBeforeChat={isAlreadyCompleted && !completion}
            />
          ) : (
            <PromptInput
              onSubmit={handleSubmit}
              className="rounded-2xl border border-border bg-card shadow-sm focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/20"
            >
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder={`Talk through "${lesson.title}" with your tutor…`}
                disabled={isComplete}
              />
              <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
                <p className="text-[11px] text-muted-foreground">
                  Press <kbd className="font-mono">Enter</kbd> to send,{" "}
                  <kbd className="font-mono">Shift+Enter</kbd> for newline
                </p>
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  disabled={!input.trim() && !isStreaming}
                />
              </div>
            </PromptInput>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonHeader({ course, lesson }: { course: Course; lesson: Lesson }) {
  return (
    <header className="border-b border-border bg-background/60 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-background/40">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <BookOpen className="size-3.5" />
          <span className="uppercase tracking-wider">{course.title}</span>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{lesson.title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {lesson.outcomes.map((outcome, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-normal text-muted-foreground"
            >
              {outcome}
            </Badge>
          ))}
        </div>
      </div>
    </header>
  );
}

function MessageView({
  message,
  onSaveNote,
}: {
  message: UIMessage;
  onSaveNote: (text: string) => void;
}) {
  const isAssistant = message.role === "assistant";
  return (
    <Message from={message.role}>
      <MessageContent
        className={cn(
          isAssistant && "max-w-none [&_pre]:font-mono [&_code]:font-mono"
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div key={i} className="group/note">
                <MessageResponse className="leading-7 [&>p]:my-2 [&_pre]:rounded-lg">
                  {part.text}
                </MessageResponse>
                {isAssistant && part.text.trim() && (
                  <SaveToNotesFlow
                    fullText={part.text}
                    onSave={onSaveNote}
                  />
                )}
              </div>
            );
          }
          if (part.type === "tool-complete_lesson") {
            const toolPart = part as ToolUIPart;
            if (toolPart.state === "output-available") {
              return null;
            }
            return (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Sparkles className="size-4 animate-pulse text-brand" />
                Checking the mastery outcomes…
              </div>
            );
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
}

type SaveMode = "idle" | "editing" | "saved";

function SaveToNotesFlow({
  fullText,
  onSave,
}: {
  fullText: string;
  onSave: (text: string) => void;
}) {
  const [mode, setMode] = useState<SaveMode>("idle");
  const [draft, setDraft] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode !== "editing") return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [mode]);

  const openEditor = () => {
    const selection =
      typeof window !== "undefined" ? window.getSelection() : null;
    const selectedText = selection?.toString().trim() ?? "";
    setDraft(selectedText);
    setSummaryError(null);
    setMode("editing");
  };

  const handleSave = () => {
    const text = draft.trim();
    if (!text) return;
    onSave(text);
    setDraft("");
    setSummaryError(null);
    setMode("saved");
    window.setTimeout(() => setMode("idle"), 1500);
  };

  const handleCancel = () => {
    setDraft("");
    setSummaryError(null);
    setMode("idle");
  };

  const handleSummarize = async () => {
    const source = draft.trim() || fullText.trim();
    if (!source || isSummarizing) return;
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as { summary?: string };
      const summary = data.summary?.trim();
      if (!summary) throw new Error("Empty summary returned");
      setDraft(summary);
    } catch (err) {
      setSummaryError(
        err instanceof Error ? err.message : "Could not summarize"
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (mode === "saved") {
    return (
      <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-success">
        <Check className="size-3.5" />
        Saved to notes
      </div>
    );
  }

  if (mode === "editing") {
    return (
      <div className="mt-2 rounded-lg border border-border bg-background/80 p-2 shadow-sm">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a short bullet to save…"
          rows={3}
          disabled={isSummarizing}
          className="min-h-[60px] w-full resize-none rounded-md bg-transparent px-2 py-1.5 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSummarize}
              disabled={isSummarizing || (!draft.trim() && !fullText.trim())}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                "text-brand hover:bg-brand/10",
                "disabled:opacity-50 disabled:hover:bg-transparent"
              )}
              title="Use AI to compress into one short sentence"
            >
              {isSummarizing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {isSummarizing ? "Summarizing…" : "Summarize as a short sentence"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(fullText)}
              disabled={isSummarizing}
              className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Use full message
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSummarizing}
              className="h-7 px-2 text-[11px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!draft.trim() || isSummarizing}
              className="h-7 px-2.5 text-[11px]"
            >
              <BookmarkPlus className="size-3.5" />
              Save
            </Button>
          </div>
        </div>
        {summaryError && (
          <p className="px-1 pt-1 text-[10px] text-destructive">
            Couldn&apos;t summarize: {summaryError}
          </p>
        )}
        <p className="px-1 pt-1 text-[10px] text-muted-foreground">
          Tip: highlight text in the message first for a quick bullet, or type
          your own. <kbd className="font-mono">⌘↵</kbd> to save,{" "}
          <kbd className="font-mono">Esc</kbd> to cancel.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openEditor}
      className={cn(
        "mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
        "text-muted-foreground opacity-0 group-hover/note:opacity-100 focus-visible:opacity-100",
        "hover:bg-muted hover:text-foreground"
      )}
      aria-label="Save to notes"
      title="Save to notes (highlight text first for a quick bullet)"
    >
      <BookmarkPlus className="size-3.5" />
      Save to notes
    </button>
  );
}

function PreparingState({ lesson }: { lesson: Lesson }) {
  return (
    <div className="flex flex-col items-center gap-5 py-16 text-center">
      <div className="relative inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-semibold tracking-tight">
          Your tutor is getting ready…
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Setting up{" "}
          <span className="font-medium text-foreground">{lesson.title}</span>{" "}
          and saying hello.
        </p>
      </div>
    </div>
  );
}

function CompletedEmptyState({ lesson }: { lesson: Lesson }) {
  return (
    <div className="flex flex-col items-center gap-5 py-16 text-center">
      <div className="relative inline-flex size-12 items-center justify-center rounded-2xl bg-success/15">
        <CheckCircle2 className="size-6 text-success" />
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-semibold tracking-tight">
          You&apos;ve already mastered this lesson
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{lesson.title}</span>{" "}
          is complete. Open the next lesson to keep going.
        </p>
      </div>
    </div>
  );
}

function CompletionCard({
  output,
  nextLesson,
  onAdvance,
}: {
  output: CompleteLessonOutput;
  nextLesson: Lesson | null;
  onAdvance: (lessonId: string) => void;
}) {
  return (
    <div className="tutor-pop-in">
      <div className="overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/5 to-transparent">
        <div className="flex items-start gap-4 px-5 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="size-5 text-success" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
              Lesson complete
            </p>
            <h3 className="text-base font-semibold tracking-tight">
              {output.lessonTitle ?? "Mastery reached"}
            </h3>
            {output.reason && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {output.reason}
              </p>
            )}
          </div>
        </div>
        {nextLesson && (
          <div className="flex items-center justify-between gap-3 border-t border-brand/15 bg-background/40 px-5 py-3">
            <div className="min-w-0 text-sm">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Up next
              </p>
              <p className="truncate font-medium">{nextLesson.title}</p>
            </div>
            <Button
              onClick={() => onAdvance(nextLesson.id)}
              size="lg"
              className="shrink-0"
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function LockedInputNotice({
  nextLesson,
  onAdvance,
  alreadyCompletedBeforeChat,
}: {
  nextLesson: Lesson | null;
  onAdvance: (lessonId: string) => void;
  alreadyCompletedBeforeChat: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {alreadyCompletedBeforeChat
          ? "You've already mastered this lesson. Open the next one to keep going."
          : "This lesson is complete. Ready for the next one?"}
      </p>
      {nextLesson && (
        <Button onClick={() => onAdvance(nextLesson.id)} size="sm">
          Continue
          <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}

