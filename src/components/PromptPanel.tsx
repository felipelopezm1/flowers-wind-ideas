"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { copyShareUrl } from "@/lib/seedManager";

interface PromptPanelProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  currentPrompt: string;
  seed: number;
  onToggleHistory: () => void;
}

export default function PromptPanel({
  onGenerate,
  isLoading,
  currentPrompt,
  seed,
  onToggleHistory,
}: PromptPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!panelRef.current) return;
    gsap.fromTo(
      panelRef.current,
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: 0.8 }
    );
  }, []);

  useEffect(() => {
    if (!formRef.current) return;
    if (isLoading) {
      gsap.to(formRef.current, {
        scale: 0.97,
        duration: 0.3,
        ease: "power2.out",
      });
    } else {
      gsap.to(formRef.current, {
        scale: 1,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)",
      });
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onGenerate(prompt.trim());
  };

  const handleShare = useCallback(async () => {
    if (!currentPrompt) return;
    const success = await copyShareUrl(currentPrompt, seed);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentPrompt, seed]);

  return (
    <div
      ref={panelRef}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 opacity-0"
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-xl rounded-2xl px-5 py-3.5 shadow-2xl border border-white/[0.06]"
        style={{ minWidth: "380px", maxWidth: "560px" }}
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your flowers..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-white/90 placeholder-white/30 text-sm outline-none font-light tracking-wide min-w-0"
        />

        <div className="flex items-center gap-1.5">
          {isLoading && (
            <span className="text-[10px] text-white/30 font-light tracking-wider animate-pulse">
              blooming
            </span>
          )}

          {currentPrompt && !isLoading && (
            <>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-all duration-200 shrink-0"
                title="Copy share link"
              >
                {copied ? (
                  <svg
                    className="w-3.5 h-3.5 text-green-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3.5 h-3.5 text-white/40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleHistory}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-all duration-200 shrink-0"
                title="History"
              >
                <svg
                  className="w-3.5 h-3.5 text-white/40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" strokeLinecap="round" />
                </svg>
              </button>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-all duration-200 shrink-0"
          >
            {isLoading ? (
              <svg
                className="w-4 h-4 text-white/70 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-25"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="opacity-75"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-white/70"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </form>

      <p className="text-center text-white/15 text-[10px] mt-2.5 font-light tracking-[0.2em] uppercase select-none">
        Flower Wind
      </p>
    </div>
  );
}
