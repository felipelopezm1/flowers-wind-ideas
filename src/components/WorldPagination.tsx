"use client";

import { WorldNode } from "@/types/ideas";

interface WorldPaginationProps {
  pathWorlds: WorldNode[];
  siblingWorlds: WorldNode[];
  currentWorldId: string;
  onPathSelect: (worldId: string) => void;
  onSiblingSelect: (worldId: string) => void;
}

function Dot({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative h-3 w-3 rounded-full transition-all duration-300",
        active
          ? "bg-white/85 ring-1 ring-white/35 scale-110"
          : "bg-white/20 hover:bg-white/45 hover:scale-105",
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      <span className="absolute left-1/2 top-[-1.35rem] -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-950/90 px-2 py-1 text-[9px] font-light tracking-wide text-white/65 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

export default function WorldPagination({
  pathWorlds,
  siblingWorlds,
  currentWorldId,
  onPathSelect,
  onSiblingSelect,
}: WorldPaginationProps) {
  const showSiblingRow = siblingWorlds.length > 1;

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/[0.06] bg-zinc-950/45 px-3 py-2 backdrop-blur-xl">
        {pathWorlds.map((world, index) => (
          <Dot
            key={world.id}
            active={world.id === currentWorldId}
            label={index === 0 ? world.title || "Root" : `${index + 1}. ${world.title || "World"}`}
            onClick={() => onPathSelect(world.id)}
          />
        ))}
      </div>

      {showSiblingRow && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/[0.05] bg-zinc-950/30 px-3 py-1.5 backdrop-blur-xl">
          {siblingWorlds.map((world) => (
            <Dot
              key={world.id}
              active={world.id === currentWorldId}
              label={world.title || "Sibling world"}
              onClick={() => onSiblingSelect(world.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
