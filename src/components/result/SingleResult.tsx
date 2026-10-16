import type { SingleResult as Single } from "@/lib/results";
import { primaryButton } from "../ui";
import { PianoRoll } from "./PianoRoll";

export function SingleResult({ single }: { single: Single }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="font-serif text-[32px] font-light leading-[1.05] text-text">One new clip</h2>
          <div className="break-all font-mono text-[12.5px] leading-[1.4] text-text-2">
            {single.name} <span className="text-text-3">· {single.meta}</span>
          </div>
        </div>
        <a href={single.url} download={single.name} className={primaryButton}>
          Download .mid <span className="font-mono text-[13px] font-normal">↓</span>
        </a>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {single.ops.map((op) => (
          <span key={op} className="rounded-full bg-accent-soft px-[9px] py-1.5 font-mono text-[11.5px] leading-none text-accent">
            {op}
          </span>
        ))}
      </div>

      <PianoRoll tall ghost={single.ghost} notes={single.notes} />

      <div className="flex gap-[18px] font-sans text-xs text-text-3">
        <span className="flex items-center gap-[7px]">
          <span className="h-1.5 w-3.5 rounded-[2px] bg-text-3 opacity-35" />
          original
        </span>
        <span className="flex items-center gap-[7px]">
          <span className="h-1.5 w-3.5 rounded-[2px] bg-accent" />
          mutated
        </span>
      </div>
    </div>
  );
}
