"use client";

import { useState, useEffect, useRef } from "react";
import { FlowerIdea } from "@/types/ideas";

interface IdeaModalProps {
  idea: FlowerIdea | null;
  onClose: () => void;
  onSave: (text: string) => void;
  onComplete: () => void;
  onVisitWorld: () => void;
  hasSubWorld: boolean;
  side: "left" | "right" | "bottom";
  anchorY?: number;
}

export default function IdeaModal({
  idea,
  onClose,
  onSave,
  onComplete,
  onVisitWorld,
  hasSubWorld,
  side,
  anchorY,
}: IdeaModalProps) {
  const [text, setText] = useState(idea?.text ?? "");
  const [editing, setEditing] = useState(!idea);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(idea?.text ?? "");
    setEditing(!idea);
  }, [idea]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") onClose();
  };

  const isCompleted = idea?.status === "completed";
  const isActive = idea?.status === "active";
  const desktopTop =
    typeof window === "undefined"
      ? 140
      : Math.min(window.innerHeight - 360, Math.max(104, (anchorY ?? window.innerHeight * 0.5) - 132));

  const wrapperClass =
    side === "bottom"
      ? "fixed inset-x-4 bottom-24 z-[80] pointer-events-none md:hidden"
      : "fixed inset-y-0 z-[80] hidden pointer-events-none md:block";

  const panelClass =
    side === "bottom"
      ? "pointer-events-auto mx-auto w-full max-w-xl"
      : [
          "pointer-events-auto absolute w-[min(24rem,32vw)] max-w-sm",
          side === "left" ? "left-5" : "right-5",
        ].join(" ");

  return (
    <div className={wrapperClass}>
      {side !== "bottom" && (
        <div
          className={[
            "pointer-events-none absolute inset-y-0 w-[30vw] max-w-sm",
            side === "left"
              ? "left-0 bg-gradient-to-r from-zinc-950/18 via-zinc-950/10 to-transparent"
              : "right-0 bg-gradient-to-l from-zinc-950/18 via-zinc-950/10 to-transparent",
          ].join(" ")}
        />
      )}

      <div
        className={panelClass}
        style={side === "bottom" ? undefined : { top: `${desktopTop}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-[1.4rem] border border-white/[0.08] bg-zinc-900/86 shadow-2xl backdrop-blur-2xl">
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <p className="text-[10px] text-white/30 font-light tracking-[0.2em] uppercase">
              {isCompleted ? "Completed Idea" : isActive ? "Your Idea" : "Plant an Idea"}
            </p>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none"
            >
              &times;
            </button>
          </div>

          <div className="px-5 pb-5">
            {editing ? (
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's your idea?"
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-3 text-white/90 text-sm placeholder-white/25 outline-none resize-none focus:border-white/15 transition-colors font-light"
              />
            ) : (
              <p className="text-white/80 text-sm font-light leading-relaxed py-2">{idea?.text}</p>
            )}

            <div className="flex gap-2 mt-3">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={!text.trim()}
                    className="flex-1 px-4 py-2 rounded-xl bg-white/10 text-white/80 text-xs font-light tracking-wide hover:bg-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  {isActive && (
                    <button
                      onClick={() => { setEditing(false); setText(idea?.text ?? ""); }}
                      className="px-4 py-2 rounded-xl bg-white/[0.04] text-white/40 text-xs font-light tracking-wide hover:bg-white/[0.08] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </>
              ) : isActive ? (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex-1 px-4 py-2 rounded-xl bg-white/[0.06] text-white/60 text-xs font-light tracking-wide hover:bg-white/10 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={onComplete}
                    className="flex-1 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300/90 text-xs font-light tracking-wide hover:bg-amber-500/30 transition-colors border border-amber-500/10"
                  >
                    Complete
                  </button>
                </>
              ) : isCompleted && hasSubWorld ? (
                <button
                  onClick={onVisitWorld}
                  className="flex-1 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300/90 text-xs font-light tracking-wide hover:bg-indigo-500/30 transition-colors border border-indigo-500/10"
                >
                  Visit World
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
