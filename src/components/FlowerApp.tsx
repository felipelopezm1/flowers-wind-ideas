"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import PromptPanel from "./PromptPanel";
import StyleSwitcher from "./StyleSwitcher";
import IdeaModal from "./IdeaModal";
import WorldHUD from "./WorldHUD";
import WorldPagination from "./WorldPagination";
import { FlowerGenerationParams } from "@/types/flowers";
import { FlowerIdea, WorldNode } from "@/types/ideas";
import { DEFAULT_PARAMS } from "@/lib/defaultParams";
import { getStyle } from "@/lib/styles";
import {
  saveWorld,
  getWorld,
  getSiblingWorlds,
  getWorldPath,
} from "@/lib/worldStore";
import { hashString } from "@/lib/seededRng";
import {
  decodeFromUrl,
  saveToHistory,
  getHistory,
  HistoryEntry,
} from "@/lib/seedManager";
import { TravelRequest } from "./Scene";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

type PanelSide = "left" | "right" | "bottom";

interface ActiveFlowerState {
  index: number;
  position: THREE.Vector3;
  screenX: number;
  screenY: number;
  side: PanelSide;
}

function makeRootWorld(params: FlowerGenerationParams, prompt: string): WorldNode {
  return {
    id: "root",
    parentId: null,
    sourceFlowerIndex: null,
    title: prompt || "My Garden",
    subtitle: params.mood || "a world of ideas",
    params,
    ideas: {},
  };
}

function resolvePanelSide(screenX: number): PanelSide {
  if (typeof window === "undefined") return "right";
  if (window.innerWidth < 768) return "bottom";
  return screenX < window.innerWidth * 0.5 ? "left" : "right";
}

function deriveSubWorldParams(parentParams: FlowerGenerationParams, subSeed: number): FlowerGenerationParams {
  return {
    ...parentParams,
    seed: subSeed,
    sceneColors: {
      ...parentParams.sceneColors,
    },
  };
}

export default function FlowerApp() {
  const [worldStack, setWorldStack] = useState<WorldNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [locked, setLocked] = useState(false);
  const [styleId, setStyleId] = useState("lush");
  const [mounted, setMounted] = useState(false);
  const [activeFlower, setActiveFlower] = useState<ActiveFlowerState | null>(null);
  const [travelRequest, setTravelRequest] = useState<TravelRequest | null>(null);
  const pendingTravelRef = useRef<(() => void) | null>(null);

  const currentWorld = worldStack.length > 0 ? worldStack[worldStack.length - 1] : null;
  const params = currentWorld?.params ?? null;

  useEffect(() => {
    setMounted(true);
    const urlData = decodeFromUrl();
    if (urlData) {
      setCurrentPrompt(urlData.prompt);
      handleGenerate(urlData.prompt);
    } else {
      const existingRoot = getWorld("root");
      if (existingRoot) {
        setWorldStack([existingRoot]);
        setCurrentPrompt(existingRoot.title);
      }
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

      const root = makeRootWorld(data, prompt);
      const existing = getWorld("root");
      if (existing) {
        root.ideas = existing.ideas;
        root.title = existing.title !== "My Garden" ? existing.title : prompt;
        root.subtitle = existing.subtitle;
      }
      root.params = data;
      saveWorld(root);
      setWorldStack([root]);
      setActiveFlower(null);

      saveToHistory(prompt, data);
      setHistory(getHistory());

      const url = new URL(window.location.href);
      url.searchParams.set("q", prompt);
      url.searchParams.set("seed", String(data.seed));
      window.history.replaceState({}, "", url.toString());
    } catch (err) {
      console.error("Generation error:", err);
      const base = params ?? DEFAULT_PARAMS;
      const fallback = { ...base, seed: base.seed + 1 };
      const root = makeRootWorld(fallback, prompt);
      saveWorld(root);
      setWorldStack([root]);
      setActiveFlower(null);
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    const root = makeRootWorld(entry.params, entry.prompt);
    const existing = getWorld("root");
    if (existing && existing.params.seed === entry.params.seed) {
      root.ideas = existing.ideas;
      root.title = existing.title;
      root.subtitle = existing.subtitle;
    }
    root.params = entry.params;
    saveWorld(root);
    setWorldStack([root]);
    setCurrentPrompt(entry.prompt);
    setShowHistory(false);
    setActiveFlower(null);

    const url = new URL(window.location.href);
    url.searchParams.set("q", entry.prompt);
    url.searchParams.set("seed", String(entry.seed));
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    if (!activeFlower) return;

    const handleResize = () => {
      setActiveFlower((prev) =>
        prev
          ? {
              ...prev,
              side: resolvePanelSide(prev.screenX),
            }
          : prev
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeFlower]);

  const beginTravel = useCallback((type: TravelRequest["type"], applyNavigation: () => void) => {
    if (travelRequest) return;
    pendingTravelRef.current = applyNavigation;
    setTravelRequest({ id: Date.now(), type });
  }, [travelRequest]);

  const handleTravelHalfway = useCallback(() => {
    pendingTravelRef.current?.();
    pendingTravelRef.current = null;
  }, []);

  const handleTravelComplete = useCallback(() => {
    setTravelRequest(null);
  }, []);

  const handleFlowerClick = useCallback((
    globalIndex: number,
    position: THREE.Vector3,
    screenX: number,
    screenY: number
  ) => {
    setActiveFlower({
      index: globalIndex,
      position,
      screenX,
      screenY,
      side: resolvePanelSide(screenX),
    });
  }, []);

  const handleIdeaSave = useCallback((text: string) => {
    if (!currentWorld || !activeFlower) return;
    const updated = { ...currentWorld };
    const existing = updated.ideas[activeFlower.index];
    if (existing) {
      updated.ideas = { ...updated.ideas, [activeFlower.index]: { ...existing, text } };
    } else {
      updated.ideas = {
        ...updated.ideas,
        [activeFlower.index]: { text, status: "active", createdAt: Date.now() },
      };
    }
    saveWorld(updated);
    setWorldStack((prev) => [...prev.slice(0, -1), updated]);
  }, [activeFlower, currentWorld]);

  const handleIdeaComplete = useCallback(() => {
    if (!currentWorld || !activeFlower) return;
    const idea = currentWorld.ideas[activeFlower.index];
    if (!idea) return;

    const subSeed = hashString(`${currentWorld.id}.${activeFlower.index}`);
    const subParams = deriveSubWorldParams(currentWorld.params, subSeed);
    const subWorldId = `${currentWorld.id}.${activeFlower.index}`;

    const subWorld: WorldNode = {
      id: subWorldId,
      parentId: currentWorld.id,
      sourceFlowerIndex: activeFlower.index,
      title: idea.text.slice(0, 40),
      subtitle: "a blooming idea",
      params: subParams,
      ideas: {},
    };
    saveWorld(subWorld);

    const updated = { ...currentWorld };
    updated.ideas = {
      ...updated.ideas,
      [activeFlower.index]: {
        ...idea,
        status: "completed",
        completedAt: Date.now(),
        subWorldSeed: subSeed,
      },
    };
    saveWorld(updated);
    setWorldStack((prev) => [...prev.slice(0, -1), updated]);
    setActiveFlower(null);
  }, [activeFlower, currentWorld]);

  const handleVisitWorld = useCallback(() => {
    if (!currentWorld || !activeFlower) return;
    const idea = currentWorld.ideas[activeFlower.index];
    if (!idea || idea.status !== "completed") return;

    const subWorldId = `${currentWorld.id}.${activeFlower.index}`;
    const subWorld = getWorld(subWorldId);
    if (subWorld) {
      beginTravel("in", () => {
        setWorldStack(getWorldPath(subWorld.id));
        setActiveFlower(null);
      });
    }
  }, [activeFlower, beginTravel, currentWorld]);

  const handleBack = useCallback(() => {
    if (!currentWorld?.parentId) return;
    beginTravel("out", () => {
      setWorldStack(getWorldPath(currentWorld.parentId!));
      setActiveFlower(null);
    });
  }, [beginTravel, currentWorld]);

  const handlePathSelect = useCallback((worldId: string) => {
    if (!currentWorld || worldId === currentWorld.id) return;
    beginTravel("out", () => {
      setWorldStack(getWorldPath(worldId));
      setActiveFlower(null);
    });
  }, [beginTravel, currentWorld]);

  const handleSiblingSelect = useCallback((worldId: string) => {
    if (!currentWorld || worldId === currentWorld.id) return;
    beginTravel("side", () => {
      setWorldStack(getWorldPath(worldId));
      setActiveFlower(null);
    });
  }, [beginTravel, currentWorld]);

  const handleTitleChange = useCallback((title: string) => {
    if (!currentWorld) return;
    const updated = { ...currentWorld, title };
    saveWorld(updated);
    setWorldStack((prev) => [...prev.slice(0, -1), updated]);
  }, [currentWorld]);

  const handleSubtitleChange = useCallback((subtitle: string) => {
    if (!currentWorld) return;
    const updated = { ...currentWorld, subtitle };
    saveWorld(updated);
    setWorldStack((prev) => [...prev.slice(0, -1), updated]);
  }, [currentWorld]);

  const style = getStyle(styleId);
  const bgColor = params?.sceneColors?.bgColor || style.bgColor;
  const ideas = currentWorld?.ideas ?? {};
  const modalIdea = activeFlower ? (ideas[activeFlower.index] ?? null) : null;
  const hasSubWorld = activeFlower && modalIdea?.status === "completed"
    ? !!getWorld(`${currentWorld?.id}.${activeFlower.index}`)
    : false;

  const panelSide = activeFlower?.side ?? null;
  const focusBias = panelSide === "left" ? -0.72 : panelSide === "right" ? 0.72 : 0;
  const sceneShiftX = panelSide === "left" ? "14vw" : panelSide === "right" ? "-14vw" : "0vw";
  const pathWorlds = currentWorld ? worldStack : [];
  const siblingWorlds = currentWorld ? getSiblingWorlds(currentWorld.id) : [];

  return (
    <main className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: bgColor }}>
      {mounted && (
        <div
          className="absolute inset-0 transition-transform duration-500 ease-out"
          style={{
            transform:
              activeFlower?.side && activeFlower.side !== "bottom" ? `translateX(${sceneShiftX})` : "translateX(0)",
          }}
        >
          <Scene
            params={params}
            locked={locked}
            styleId={styleId}
            ideas={ideas}
            focusBias={focusBias}
            travelRequest={travelRequest}
            onFlowerClick={handleFlowerClick}
            onTravelHalfway={handleTravelHalfway}
            onTravelComplete={handleTravelComplete}
          />
        </div>
      )}

      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{ background: `radial-gradient(ellipse at center, transparent 50%, ${bgColor}99 100%)` }}
      />

      <button
        onClick={() => setLocked(!locked)}
        className="fixed top-5 right-5 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] hover:bg-zinc-900/80 transition-all duration-200"
        title={locked ? "Unlock rotation" : "Lock rotation"}
      >
        <svg className="w-3.5 h-3.5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {locked ? (
            <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>
          ) : (
            <><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 019.9-1" /></>
          )}
        </svg>
        <span className="text-[10px] text-white/50 font-light tracking-wider uppercase">
          {locked ? "Locked" : "Free"}
        </span>
      </button>

      {currentWorld && (
        <WorldHUD
          title={currentWorld.title}
          subtitle={currentWorld.subtitle}
          seed={currentWorld.params.seed}
          depth={worldStack.length - 1}
          onTitleChange={handleTitleChange}
          onSubtitleChange={handleSubtitleChange}
          onBack={worldStack.length > 1 ? handleBack : undefined}
        />
      )}

      <StyleSwitcher activeId={styleId} onChange={setStyleId} />

      <PromptPanel
        onGenerate={handleGenerate}
        isLoading={isLoading}
        currentPrompt={currentPrompt}
        seed={params?.seed ?? 0}
        onToggleHistory={() => setShowHistory(!showHistory)}
        hidden={activeFlower?.side === "bottom"}
      />

      {showHistory && history.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 backdrop-blur-xl rounded-xl px-3 py-2.5 shadow-2xl border border-white/[0.06] max-h-56 overflow-y-auto w-[320px]">
          <p className="text-white/40 text-[9px] font-light tracking-widest uppercase mb-1.5">Recent</p>
          {history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => handleHistorySelect(entry)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-white/70 text-[11px] hover:bg-white/10 transition-colors truncate font-light"
            >
              {entry.prompt}
            </button>
          ))}
        </div>
      )}

      {currentWorld && (
        <WorldPagination
          pathWorlds={pathWorlds}
          siblingWorlds={siblingWorlds}
          currentWorldId={currentWorld.id}
          onPathSelect={handlePathSelect}
          onSiblingSelect={handleSiblingSelect}
        />
      )}

      {activeFlower && (
        <IdeaModal
          idea={modalIdea}
          onClose={() => setActiveFlower(null)}
          onSave={handleIdeaSave}
          onComplete={handleIdeaComplete}
          onVisitWorld={handleVisitWorld}
          hasSubWorld={hasSubWorld}
          side={activeFlower.side}
          anchorY={activeFlower.screenY}
        />
      )}
    </main>
  );
}
