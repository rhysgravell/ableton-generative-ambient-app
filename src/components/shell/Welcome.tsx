import { GROUPS, TOOLS, type ToolId } from "@/lib/tools";

/** Desktop empty state: hero and a grid of tool cards over faint strata. */
export function Welcome({ onSelect }: { onSelect: (id: ToolId) => void }) {
  return (
    <div className="relative hidden flex-1 flex-col justify-center gap-11 overflow-hidden px-16 py-14 md:flex">
      <div aria-hidden className="strata pointer-events-none absolute inset-x-0 bottom-0 h-[42%] opacity-80" />
      <div className="relative flex max-w-[640px] flex-col gap-3.5">
        <h1 className="font-serif text-[54px] font-light leading-[1.04] tracking-[-0.015em] text-text">
          Six tools for <span className="italic">slow music.</span>
        </h1>
        <p className="max-w-[540px] font-sans text-base leading-[1.6] text-pretty text-text-2">
          Generate new MIDI from a few settings, reshape a file you already have, or look something up. Every tool starts from
          defaults — G minor, 80 BPM, 16 bars — so you can run it straight away.
        </p>
      </div>
      <div className="relative grid grid-cols-3 gap-5">
        {GROUPS.map((g) => (
          <div key={g.label} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2 px-1">
              <span className="caps">{g.label}</span>
              <span className="font-sans text-xs text-text-3">{g.sub}</span>
            </div>
            {TOOLS.filter((t) => t.group === g.label).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t.id)}
                className="flex min-h-[132px] cursor-pointer flex-col gap-2 rounded-[14px] border border-line-soft bg-raised px-[18px] pb-4 pt-[18px] text-left hover:border-accent-line"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-[22px] leading-[1.1] text-text">{t.name}</span>
                  <span className="font-mono text-[11px] text-text-3">{t.out}</span>
                </span>
                <span className="font-sans text-[13.5px] leading-normal text-pretty text-text-2">{t.blurb}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
