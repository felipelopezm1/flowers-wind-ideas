import { FlowerGenerationParams } from "@/types/flowers";

const STORAGE_KEY = "flower-wind-history";
const MAX_HISTORY = 20;

export interface HistoryEntry {
  id: string;
  prompt: string;
  seed: number;
  params: FlowerGenerationParams;
  timestamp: number;
}

export function encodeToUrl(prompt: string, seed: number): string {
  const url = new URL(window.location.origin);
  url.searchParams.set("q", prompt);
  url.searchParams.set("seed", String(seed));
  return url.toString();
}

export function decodeFromUrl(): { prompt: string; seed: number } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  const seed = params.get("seed");
  if (!q || !seed) return null;
  return { prompt: q, seed: parseInt(seed, 10) };
}

export function saveToHistory(
  prompt: string,
  params: FlowerGenerationParams
): void {
  if (typeof window === "undefined") return;
  try {
    const history = getHistory();
    const entry: HistoryEntry = {
      id: `${params.seed}-${Date.now()}`,
      prompt,
      seed: params.seed,
      params,
      timestamp: Date.now(),
    };

    const updated = [entry, ...history.filter((h) => h.seed !== params.seed)];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated.slice(0, MAX_HISTORY))
    );
  } catch {
    // localStorage might be full or unavailable
  }
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function copyShareUrl(
  prompt: string,
  seed: number
): Promise<boolean> {
  try {
    const url = encodeToUrl(prompt, seed);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
