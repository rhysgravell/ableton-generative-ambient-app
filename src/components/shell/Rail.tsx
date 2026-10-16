"use client";

import { setTheme, useTheme } from "@/lib/theme";
import { GROUPS, TOOLS, type ToolId } from "@/lib/tools";
import { Segmented } from "../fields/Segmented";
import { cx } from "../ui";

export function ToolDot({ on }: { on: boolean }) {
  return <span className={cx("size-1.5 flex-none rounded-full", on ? "halo bg-accent" : "bg-line")} />;
}

function Wordmark() {
  return (
    <span className="flex flex-col gap-[3px]" aria-hidden>
      <span className="block h-0.5 w-7 rounded-sm bg-accent" />
      <span className="block h-0.5 w-5 rounded-sm bg-accent opacity-55" />
      <span className="block h-0.5 w-3 rounded-sm bg-accent opacity-25" />
    </span>
  );
}

/** Desktop sidebar (≥ md). */
export function Rail({ tool, onSelect, onHome }: { tool: ToolId | null; onSelect: (id: ToolId) => void; onHome: () => void }) {
  const theme = useTheme();
  return (
    <aside className="hidden w-[236px] flex-none flex-col gap-[30px] overflow-y-auto border-r border-line-soft bg-rail px-3.5 pb-[18px] pt-[26px] md:flex">
      <button type="button" onClick={onHome} className="flex cursor-pointer flex-col gap-3 px-2.5 text-left" aria-label="Buried Landscapes — home">
        <Wordmark />
        <span className="font-serif text-[25px] font-light italic leading-[1.02] tracking-[-0.01em] text-text">
          Buried
          <br />
          Landscapes
        </span>
      </button>

      <nav className="flex flex-col gap-[22px]" aria-label="Tools">
        {GROUPS.map((g) => (
          <div key={g.label} className="flex flex-col gap-0.5">
            <div className="caps px-2.5 pb-[9px]">{g.label}</div>
            {TOOLS.filter((t) => t.group === g.label).map((t) => {
              const on = t.id === tool;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => onSelect(t.id)}
                  className={cx(
                    "flex h-[38px] cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 font-sans text-sm font-medium",
                    on ? "bg-raised text-text shadow-[inset_0_0_0_1px_var(--line-soft)]" : "text-text-2 hover:text-text",
                  )}
                >
                  <ToolDot on={on} />
                  <span className="flex-1 text-left">{t.name}</span>
                  <span className="font-mono text-[10.5px] font-normal text-text-3">{t.out}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 px-1">
        <Segmented
          label="Theme"
          className="rounded-[10px]"
          options={[
            { v: "dark", l: "Dark" },
            { v: "light", l: "Light" },
          ]}
          value={theme}
          onChange={setTheme}
        />
        <div className="px-1.5 font-mono text-[10.5px] leading-normal text-text-3">6 scripts · standard MIDI out</div>
      </div>
    </aside>
  );
}
