"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import type { PipelineNoteData } from "@/types/inbox";

interface CardNotesProps {
  cardId: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

const MAX_CHARS = 2000;
const SHOW_COUNT_THRESHOLD = 1800;

export function CardNotes({ cardId }: CardNotesProps) {
  const [notes, setNotes] = useState<PipelineNoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/inbox/${cardId}/notes`);
      if (!res.ok) throw new Error("Failed to load notes");
      const data = await res.json();
      setNotes(data.notes ?? data);
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 4 * 24;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = newNote.trim();
    if (!trimmed || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/inbox/${cardId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) throw new Error("Failed to add note");
      const data = await res.json();
      setNotes((prev) => [data.note ?? data, ...prev]);
      setNewNote("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setIsSaving(false);
    }
  }, [cardId, newNote, isSaving]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>

      {/* Add note form */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={newNote}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setNewNote(e.target.value);
                autoResize();
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Add a note..."
            rows={1}
            className="w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {newNote.length > SHOW_COUNT_THRESHOLD && (
            <span className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground">
              {newNote.length}/{MAX_CHARS}
            </span>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          disabled={!newNote.trim() || isSaving}
          onClick={handleSubmit}
          aria-label="Send note"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No notes yet. Add one above.
        </p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {notes.map((note) => (
              <motion.div
                key={note._id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="rounded-md bg-muted/40 px-3 py-2"
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {note.content}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatRelativeTime(note.createdAt)}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
