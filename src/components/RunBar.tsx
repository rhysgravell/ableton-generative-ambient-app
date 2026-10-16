import type { Tool } from "@/lib/tools";
import { Band } from "./result/Band";
import { cx } from "./ui";

export function RunBar({
  tool,
  running,
  done,
  onRun,
  onReset,
}: {
  tool: Tool;
  running: boolean;
  done: boolean;
  onRun: () => void;
  onReset: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-[2] mt-1 flex flex-col gap-2.5 bg-[linear-gradient(to_bottom,transparent,var(--bg)_30%)] pb-3.5 pt-[22px] md:static md:mt-0 md:flex-none md:border-t md:border-line-soft md:bg-none md:pb-0 md:pt-4">
      <button
        type="button"
        onClick={running ? undefined : onRun}
        aria-disabled={running || undefined}
        className={cx(
          "relative flex h-[52px] items-center justify-between overflow-hidden rounded-[13px] border px-5 font-sans text-[15px] font-semibold",
          running ? "cursor-default border-accent-line bg-accent-soft text-accent" : "cursor-pointer border-accent bg-accent text-accent-ink",
        )}
      >
        {running && <Band />}
        <span className="relative">{running ? `${tool.busy}…` : tool.verb}</span>
        {!running && <span className="relative hidden font-mono text-xs font-normal opacity-65 md:inline">⌘ ↵</span>}
      </button>
      <div className="flex items-center justify-between gap-2.5">
        <button type="button" onClick={onReset} className="cursor-pointer py-1 font-sans text-[12.5px] text-text-3 hover:text-text-2">
          Reset to defaults
        </button>
        <span className="text-right font-sans text-xs text-text-3">
          {done ? "Settings kept — change one and run again" : "Defaults are ready to run"}
        </span>
      </div>
    </div>
  );
}
