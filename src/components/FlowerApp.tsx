"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import PromptPanel from "./PromptPanel";
import { FlowerGenerationParams } from "@/types/flowers";
import { DEFAULT_PARAMS } from "@/lib/defaultParams";
import {
  decodeFromUrl,
  saveToHistory,
  getHistory,
  HistoryEntry,
} from "@/lib/seedManager";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function FlowerApp() {
  const [params, setParams] = useState<FlowerGenerationParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const urlData = decodeFromUrl();
    if (urlData) {
      setCurrentPrompt(urlData.prompt);
      handleGenerate(urlData.prompt);
    }
    setHistory(getHistory());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setCurrentPrompt(prompt);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = (await res.json()) as FlowerGenerationParams;
      setParams(data);
      saveToHistory(prompt, data);
      setHistory(getHistory());

      const url = new URL(window.location.href);
      url.searchParams.set("q", prompt);
      url.searchParams.set("seed", String(data.seed));
      window.history.replaceState({}, "", url.toString());
    } catch (err) {
      console.error("Generation error:", err);
      setParams((prev) => {
        const base = prev ?? DEFAULT_PARAMS;
        return { ...base, seed: base.seed + 1 };
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    setParams(entry.params);
    setCurrentPrompt(entry.prompt);
    setShowHistory(false);

    const url = new URL(window.location.href);
    url.searchParams.set("q", entry.prompt);
    url.searchParams.set("seed", String(entry.seed));
    window.history.replaceState({}, "", url.toString());
  }, []);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#FAFAF8]">
      <Scene params={params} />

      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(250,250,248,0.6) 100%)",
        }}
      />

      <PromptPanel
        onGenerate={handleGenerate}
        isLoading={isLoading}
        currentPrompt={currentPrompt}
        seed={params?.seed ?? 0}
        onToggleHistory={() => setShowHistory(!showHistory)}
      />

      {showHistory && history.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-2xl border border-white/[0.06] max-h-64 overflow-y-auto w-[360px]">
          <p className="text-white/40 text-[10px] font-light tracking-widest uppercase mb-2">
            Recent Generations
          </p>
          {history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => handleHistorySelect(entry)}
              className="w-full text-left px-3 py-2 rounded-lg text-white/70 text-xs hover:bg-white/10 transition-colors truncate font-light"
            >
              {entry.prompt}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
