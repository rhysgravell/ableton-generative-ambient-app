import type { ZipResult as Zip } from "@/lib/results";
import { cx, primaryButton } from "../ui";
import { PianoRoll } from "./PianoRoll";

export function ZipResult({ zip, seedLocked, onReuseSeed }: { zip: Zip; seedLocked: boolean; onReuseSeed: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="font-serif text-[32px] font-light leading-[1.05] text-text">{zip.title}</h2>
          <div className="break-all font-mono text-[12.5px] leading-[1.4] text-text-2">
            {zip.name} <span className="text-text-3">· {zip.meta}</span>
          </div>
        </div>
        <a href={zip.url} download={zip.name} className={primaryButton}>
          Download .zip <span className="font-mono text-[13px] font-normal">↓</span>
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {[...zip.summary, `seed ${zip.seed}`].map((s) => (
          <span key={s} className="rounded-full border border-line-soft px-[9px] py-1.5 font-mono text-[11.5px] leading-none text-text-2">
            {s}
          </span>
        ))}
        <button
          type="button"
          aria-pressed={seedLocked}
          onClick={onReuseSeed}
          className={cx(
            "cursor-pointer rounded-full px-2.5 py-1.5 font-mono text-[11.5px] font-medium leading-none",
            seedLocked ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent",
          )}
        >
          {seedLocked ? "seed locked" : "reuse seed"}
        </button>
      </div>

      <ul className="flex flex-col">
        {zip.files.map((f) => (
          <li key={f.name} className="flex flex-col gap-2.5 border-t border-line-soft pb-1 pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="break-all font-mono text-[13.5px] font-medium leading-[1.3] text-text">{f.name}</span>
              <span className="font-mono text-[11.5px] text-text-3">{f.meta}</span>
            </div>
            <PianoRoll notes={f.notes} />
          </li>
        ))}
      </ul>
    </div>
  );
}
