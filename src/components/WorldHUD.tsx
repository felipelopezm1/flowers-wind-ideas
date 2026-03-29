"use client";

import { useState, useRef, useEffect } from "react";

interface WorldHUDProps {
  title: string;
  subtitle: string;
  seed: number;
  depth: number;
  onTitleChange: (title: string) => void;
  onSubtitleChange: (subtitle: string) => void;
  onBack?: () => void;
}

export default function WorldHUD({ title, subtitle, seed, depth, onTitleChange, onSubtitleChange, onBack }: WorldHUDProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [subtitleDraft, setSubtitleDraft] = useState(subtitle);
  const titleRef = useRef<HTMLInputElement>(null);
  const subtitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitleDraft(title); }, [title]);
  useEffect(() => { setSubtitleDraft(subtitle); }, [subtitle]);
  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (editingSubtitle) subtitleRef.current?.focus(); }, [editingSubtitle]);

  const commitTitle = () => {
    const v = titleDraft.trim() || "My Garden";
    onTitleChange(v);
    setEditingTitle(false);
  };

  const commitSubtitle = () => {
    onSubtitleChange(subtitleDraft.trim());
    setEditingSubtitle(false);
  };

  return (
    <div className="fixed top-16 right-5 z-40 text-right select-none max-w-[200px]">
      {depth > 0 && onBack && (
        <button
          onClick={onBack}
          className="mb-2 flex items-center gap-1 ml-auto px-2.5 py-1 rounded-lg bg-zinc-900/50 backdrop-blur-md border border-white/[0.06] hover:bg-zinc-900/70 transition-colors text-white/50 hover:text-white/70"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="text-[9px] font-light tracking-wider uppercase">Back</span>
        </button>
      )}

      {editingTitle ? (
        <input
          ref={titleRef}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setTitleDraft(title); setEditingTitle(false); } }}
          className="bg-transparent text-white/80 text-sm font-light outline-none border-b border-white/20 w-full text-right"
        />
      ) : (
        <p
          onClick={() => setEditingTitle(true)}
          className="text-white/70 text-sm font-light cursor-text truncate hover:text-white/90 transition-colors"
          title="Click to edit title"
        >
          {title || "My Garden"}
        </p>
      )}

      {editingSubtitle ? (
        <input
          ref={subtitleRef}
          value={subtitleDraft}
          onChange={(e) => setSubtitleDraft(e.target.value)}
          onBlur={commitSubtitle}
          onKeyDown={(e) => { if (e.key === "Enter") commitSubtitle(); if (e.key === "Escape") { setSubtitleDraft(subtitle); setEditingSubtitle(false); } }}
          className="bg-transparent text-white/40 text-[10px] font-light outline-none border-b border-white/10 w-full text-right mt-0.5"
        />
      ) : (
        <p
          onClick={() => setEditingSubtitle(true)}
          className="text-white/35 text-[10px] font-light cursor-text truncate hover:text-white/50 transition-colors mt-0.5"
          title="Click to edit subtitle"
        >
          {subtitle || "a world of ideas"}
        </p>
      )}

      <p className="text-white/15 text-[8px] font-light tracking-[0.15em] mt-1.5 tabular-nums">
        SEED {seed}
      </p>
    </div>
  );
}
