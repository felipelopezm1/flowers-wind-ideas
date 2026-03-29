"use client";

import { STYLES } from "@/lib/styles";

interface StyleSwitcherProps {
  activeId: string;
  onChange: (id: string) => void;
}

export default function StyleSwitcher({ activeId, onChange }: StyleSwitcherProps) {
  return (
    <div className="fixed left-4 top-1/2 z-50 -translate-y-1/2">
      <div className="flex flex-col gap-1 rounded-2xl border border-white/[0.05] bg-zinc-950/35 p-1.5 backdrop-blur-xl">
      {STYLES.map((s) => {
        const active = s.id === activeId;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`
              group relative flex h-7 w-7 items-center justify-center rounded-full
              border border-transparent transition-all duration-250
              ${
                active
                  ? "bg-white/12 text-white/90 border-white/20"
                  : "bg-transparent text-white/40 hover:bg-white/[0.05] hover:text-white/75"
              }
            `}
            title={s.name}
          >
            <span className={`text-[11px] ${active ? "opacity-100" : "opacity-75"} transition-opacity`}>
              {s.icon}
            </span>

            <span
              className={`
                absolute left-full ml-2 px-2 py-0.5 rounded-full text-[9px] font-light tracking-wider
                bg-zinc-900/90 text-white/70 whitespace-nowrap pointer-events-none
                opacity-0 group-hover:opacity-100 transition-opacity duration-150
              `}
            >
              {s.name}
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}
