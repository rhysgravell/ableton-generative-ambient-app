import { chordName, keyIndex, parseProg, PRESETS, type Scale } from "@/lib/theory";
import type { Values } from "@/lib/tools";
import { progressionSpec } from "@/lib/validate";
import { boxClass, choiceClass, cx, inputReset } from "../ui";
import { Segmented } from "./Segmented";

type Mode = "preset" | "numerals" | "random";
const MODES: { v: Mode; l: string }[] = [
  { v: "preset", l: "Preset" },
  { v: "numerals", l: "Numerals" },
  { v: "random", l: "Random" },
];

export function Progression({ v, set, error }: { v: Values; set: (patch: Values) => void; error?: boolean }) {
  const mode = v.progMode as Mode;
  const scale = v.scale as Scale;
  const spec = progressionSpec(v);
  const parsed = spec === null ? null : parseProg(spec, scale);
  const tonic = keyIndex(String(v.key));
  const bpc = Number(v.bpc);

  return (
    <div className="flex flex-col gap-3">
      <Segmented label="Progression mode" options={MODES} value={mode} onChange={(m) => set({ progMode: m })} />

      {mode === "preset" && (
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={v.preset === p.id}
              onClick={() => set({ preset: p.id })}
              className={cx(choiceClass(v.preset === p.id), "flex flex-col gap-[7px] rounded-[11px] px-3 py-[11px]")}
            >
              <span className="font-serif text-lg italic leading-none text-text">{p.id}</span>
              <span className="font-mono text-[10.5px] leading-none text-text-3">{p.prog.replace(/-/g, " ")}</span>
            </button>
          ))}
        </div>
      )}

      {mode === "numerals" && (
        <div className={boxClass(error)}>
          <input
            aria-label="Progression numerals"
            aria-invalid={error || undefined}
            value={String(v.progText)}
            placeholder="i-VI-III-VII"
            spellCheck={false}
            onChange={(e) => set({ progText: e.target.value })}
            className={`${inputReset} h-full px-3.5 font-mono text-[15px] font-medium tracking-[0.02em] placeholder:text-text-3`}
          />
          <span className="flex-none whitespace-nowrap pr-3.5 font-mono text-[11px] text-text-3">I–VII</span>
        </div>
      )}

      {mode === "random" && (
        <div className="rounded-xl border border-dashed border-line px-3.5 py-3 font-sans text-[13px] leading-normal text-pretty text-text-2">
          A new progression every run. Set a seed to get the same one back.
        </div>
      )}

      {parsed && parsed.items.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {parsed.items.map((c, i) => (
            <span
              key={i}
              className={cx(
                "flex items-baseline gap-1.5 rounded-lg border px-2.5 py-[7px]",
                c.ok ? "border-line-soft bg-raised text-text" : "border-err bg-err-soft text-err",
              )}
            >
              <span className="font-mono text-[13px] font-medium leading-none">{c.ok ? chordName(c, tonic, scale) : "?"}</span>
              <span className="font-mono text-[10.5px] leading-none opacity-70">{c.tok}</span>
            </span>
          ))}
          {!parsed.error && bpc > 0 && (
            <span className="ml-1 font-sans text-xs text-text-3">
              {bpc} bars each · loops every {parsed.items.length * bpc} bars
            </span>
          )}
        </div>
      )}
    </div>
  );
}
