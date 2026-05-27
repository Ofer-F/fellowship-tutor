"use client";

import {
  Check,
  Clock,
  Copy,
  Layers,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLessonColor, type Note } from "@/lib/notes";
import { cn } from "@/lib/utils";

type GroupMode = "recent" | "by-lesson";

type NotesPanelProps = {
  notes: Note[];
  isOpen: boolean;
  onToggle: () => void;
  onRemoveNote: (id: string) => void;
  onClearAll: () => void;
  onJumpToLesson?: (lessonId: string) => void;
};

export function NotesPanel({
  notes,
  isOpen,
  onToggle,
  onRemoveNote,
  onClearAll,
  onJumpToLesson,
}: NotesPanelProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>("recent");

  const groupedByLesson = useMemo(() => {
    const groups = new Map<string, { lessonTitle: string; notes: Note[] }>();
    for (const note of notes) {
      const existing = groups.get(note.lessonId);
      if (existing) {
        existing.notes.push(note);
      } else {
        groups.set(note.lessonId, {
          lessonTitle: note.lessonTitle,
          notes: [note],
        });
      }
    }
    return Array.from(groups.entries()).map(([lessonId, group]) => ({
      lessonId,
      lessonTitle: group.lessonTitle,
      notes: group.notes,
    }));
  }, [notes]);

  if (!isOpen) {
    return <CollapsedStrip count={notes.length} onToggle={onToggle} />;
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
      <div className="space-y-3 border-b border-border px-5 pt-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand/10">
              <NotebookPen className="size-4 text-brand" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight">My notes</h2>
              <p className="text-[11px] text-muted-foreground">
                {notes.length === 0
                  ? "Empty for now"
                  : `${notes.length} saved ${notes.length === 1 ? "note" : "notes"}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Hide notes panel"
            title="Hide notes"
          >
            <PanelRightClose className="size-4" />
          </button>
        </div>
        {notes.length > 0 && (
          <GroupModeToggle mode={groupMode} onChange={setGroupMode} />
        )}
      </div>

      {notes.length === 0 ? (
        <NotesEmptyState />
      ) : (
        <ScrollArea className="flex-1">
          {groupMode === "recent" ? (
            <ul className="space-y-3 px-4 py-4">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onRemove={() => onRemoveNote(note.id)}
                  onJumpToLesson={
                    onJumpToLesson
                      ? () => onJumpToLesson(note.lessonId)
                      : undefined
                  }
                />
              ))}
            </ul>
          ) : (
            <div className="space-y-5 px-4 py-4">
              {groupedByLesson.map((group) => (
                <LessonGroup
                  key={group.lessonId}
                  lessonId={group.lessonId}
                  lessonTitle={group.lessonTitle}
                  notes={group.notes}
                  onRemoveNote={onRemoveNote}
                  onJumpToLesson={onJumpToLesson}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      )}

      {notes.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-border bg-background/40 px-4 py-3">
          <CopyAllButton notes={notes} />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Clear all
          </Button>
        </div>
      )}
    </aside>
  );
}

function GroupModeToggle({
  mode,
  onChange,
}: {
  mode: GroupMode;
  onChange: (next: GroupMode) => void;
}) {
  return (
    <div className="inline-flex w-full items-center rounded-md bg-muted p-0.5 text-[11px]">
      <ToggleOption
        active={mode === "recent"}
        onClick={() => onChange("recent")}
        icon={<Clock className="size-3" />}
        label="Recent"
      />
      <ToggleOption
        active={mode === "by-lesson"}
        onClick={() => onChange("by-lesson")}
        icon={<Layers className="size-3" />}
        label="By lesson"
      />
    </div>
  );
}

function ToggleOption({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2 py-1 font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function LessonGroup({
  lessonId,
  lessonTitle,
  notes,
  onRemoveNote,
  onJumpToLesson,
}: {
  lessonId: string;
  lessonTitle: string;
  notes: Note[];
  onRemoveNote: (id: string) => void;
  onJumpToLesson?: (lessonId: string) => void;
}) {
  const color = getLessonColor(lessonId);
  return (
    <section>
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={onJumpToLesson ? () => onJumpToLesson(lessonId) : undefined}
          disabled={!onJumpToLesson}
          className={cn(
            "flex min-w-0 items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
            onJumpToLesson && "hover:text-foreground"
          )}
          title={onJumpToLesson ? `Open ${lessonTitle}` : lessonTitle}
        >
          <span className={cn("size-2 shrink-0 rounded-full", color.dot)} />
          <span className="truncate">{lessonTitle}</span>
        </button>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {notes.length}
        </span>
      </header>
      <ul className="space-y-2">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onRemove={() => onRemoveNote(note.id)}
            onJumpToLesson={
              onJumpToLesson ? () => onJumpToLesson(note.lessonId) : undefined
            }
            hideLessonTag
          />
        ))}
      </ul>
    </section>
  );
}

function CollapsedStrip({
  count,
  onToggle,
}: {
  count: number;
  onToggle: () => void;
}) {
  return (
    <aside className="flex w-12 shrink-0 flex-col items-center gap-3 border-l border-border bg-card py-4">
      <button
        type="button"
        onClick={onToggle}
        className="group relative inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Show notes panel"
        title={count > 0 ? `Show ${count} note${count === 1 ? "" : "s"}` : "Show notes"}
      >
        <PanelRightOpen className="size-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      <div className="flex flex-1 items-start">
        <StickyNote className="size-4 text-muted-foreground/40" />
      </div>
    </aside>
  );
}

function NoteCard({
  note,
  onRemove,
  onJumpToLesson,
  hideLessonTag = false,
}: {
  note: Note;
  onRemove: () => void;
  onJumpToLesson?: () => void;
  hideLessonTag?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const color = getLessonColor(note.lessonId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available; silently ignore
    }
  };

  return (
    <li
      className={cn(
        "group rounded-xl border border-border bg-background/60 p-3 pl-3 shadow-sm transition-colors hover:border-foreground/20",
        "border-l-4",
        color.border
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {!hideLessonTag ? (
          <button
            type="button"
            onClick={onJumpToLesson}
            disabled={!onJumpToLesson}
            className={cn(
              "min-w-0 truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-semibold uppercase tracking-wider",
              color.chipBg,
              color.chipText,
              onJumpToLesson && "hover:opacity-80"
            )}
            title={
              onJumpToLesson ? `Open ${note.lessonTitle}` : note.lessonTitle
            }
          >
            {note.lessonTitle}
          </button>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Copy note"
            title="Copy note"
          >
            {copied ? (
              <Check className="size-3.5 text-success" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="text-[13px] leading-relaxed text-foreground/90 [&_*]:break-words [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_p]:my-0 [&_strong]:text-foreground [&_strong]:font-semibold">
        <MessageResponse>{note.text}</MessageResponse>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        {formatRelativeTime(note.createdAt)}
      </p>
    </li>
  );
}

function NotesEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
        <StickyNote className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No notes yet</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          When the tutor says something worth remembering, click{" "}
          <span className="font-medium text-foreground">Save to notes</span>{" "}
          under the message. They&apos;ll collect here across every lesson in
          this course.
        </p>
      </div>
    </div>
  );
}

function CopyAllButton({ notes }: { notes: Note[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const text = notes
      .map(
        (n) =>
          `# ${n.lessonTitle} — ${new Date(n.createdAt).toLocaleString()}\n${n.text}`
      )
      .join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopyAll}
      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-success" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          Copy all
        </>
      )}
    </Button>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(timestamp).toLocaleDateString();
}
