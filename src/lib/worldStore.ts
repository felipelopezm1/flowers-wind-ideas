import { WorldNode } from "@/types/ideas";

const STORAGE_KEY = "flower-wind-worlds";

export function loadWorlds(): Record<string, WorldNode> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, WorldNode>;
  } catch {
    return {};
  }
}

export function saveWorld(world: WorldNode): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadWorlds();
    all[world.id] = world;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage might be full
  }
}

export function getWorld(id: string): WorldNode | null {
  const all = loadWorlds();
  return all[id] ?? null;
}

export function getAllWorlds(): WorldNode[] {
  return Object.values(loadWorlds());
}

export function getChildWorlds(parentId: string | null): WorldNode[] {
  return getAllWorlds()
    .filter((world) => world.parentId === parentId)
    .sort((a, b) => {
      const aIndex = a.sourceFlowerIndex ?? -1;
      const bIndex = b.sourceFlowerIndex ?? -1;
      return aIndex - bIndex;
    });
}

export function getSiblingWorlds(worldId: string): WorldNode[] {
  const world = getWorld(worldId);
  if (!world || world.parentId === null) return [world].filter(Boolean) as WorldNode[];

  return getChildWorlds(world.parentId);
}

export function getWorldPath(worldId: string): WorldNode[] {
  const worlds = loadWorlds();
  const path: WorldNode[] = [];
  let cursor: WorldNode | null = worlds[worldId] ?? null;

  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? worlds[cursor.parentId] ?? null : null;
  }

  return path;
}

export function deleteWorld(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadWorlds();
    delete all[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}
