"use client";

import { setTheme, useTheme } from "@/lib/theme";
import { GROUPS, TOOL_BY_ID, TOOLS, type ToolId } from "@/lib/tools";
import { cx } from "../ui";
import { ToolDot } from "./Rail";

/** Mobile top bar, intro and the expanding grouped tool list (< md). */
export function MobileTop({
  tool,
  open,
  onToggle,
  onSelect,
}: {
  tool: ToolId | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: ToolId) => void;
}) {
  const theme = useTheme();
  const t = tool ? TOOL_BY_ID[tool] : null;
  const expanded = open || !tool;

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between px-[18px] pb-3.5 pt-[18px]">
        <span className="font-serif text-[22px] font-light italic leading-none text-text">Buried Landscapes</span>
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 cursor-pointer items-center rounded-full border border-line-soft px-3.5 font-sans text-[12.5px] font-medium text-text-2"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>

      {!tool && (
        <div className="flex flex-col gap-2 px-[18px] pb-[18px] pt-1.5">
          <h1 className="font-serif text-[30px] font-light leading-[1.1] text-pretty text-text">Six tools for slow music.</h1>
          <p className="font-sans text-[14.5px] leading-[1.55] text-pretty text-text-2">
            Every tool starts from defaults — G minor, 80 BPM, 16 bars — so you can run it straight away.
          </p>
        </div>
      )}

      <div className="px-[18px] pb-1">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="tool-list"
          onClick={onToggle}
          className="flex min-h-[58px] w-full cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-raised px-4 py-2.5 text-left"
        >
          <span className="flex flex-1 flex-col gap-[5px]">
            <span className="font-mono text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-text-3">{t ? t.group : "Tool"}</span>
            <span className="font-sans text-base font-medium leading-[1.1] text-text">{t ? t.name : "Choose a tool"}</span>
          </span>
          <span className="font-mono text-xs text-text-3">{expanded ? "close" : "change"}</span>
        </button>

        {expanded && (
          <nav id="tool-list" aria-label="Tools" className="mt-2 flex flex-col gap-3.5 rounded-[14px] border border-line-soft bg-rail px-2 py-3">
            {GROUPS.map((g) => (
              <div key={g.label} className="flex flex-col gap-0.5">
                <div className="px-2.5 pb-2 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-text-3">{g.label}</div>
                {TOOLS.filter((x) => x.group === g.label).map((x) => {
                  const on = x.id === tool;
                  return (
                    <button
                      key={x.id}
                      type="button"
                      aria-current={on ? "page" : undefined}
                      onClick={() => onSelect(x.id)}
                      className={cx(
                        "flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] px-3 font-sans text-[15px] font-medium",
                        on ? "bg-raised text-text" : "text-text-2",
                      )}
                    >
                      <ToolDot on={on} />
                      <span className="flex-1 text-left">{x.name}</span>
                      <span className="font-mono text-[11px] font-normal text-text-3">{x.out}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
