import type { RollNote } from "@/lib/results";
import { cx } from "../ui";

const pct = (x: number) => `${(x * 100).toFixed(3)}%`;

function NoteSpan({ n, ghost }: { n: RollNote; ghost?: boolean }) {
  return (
    <span
      className={cx("absolute min-h-0.5 rounded-[1.5px]", ghost ? "bg-text-3" : "bg-accent")}
      style={{
        left: pct(n.l),
        // Drum hits are tiny next to the clip; keep them visible.
        width: `max(2px, calc(${pct(n.w)} - 1px))`,
        bottom: `${((n.row / n.R) * 100).toFixed(2)}%`,
        height: `calc(${(100 / n.R).toFixed(2)}% - 1px)`,
        opacity: ghost ? 0.28 : n.op,
      }}
    />
  );
}

/** Notes as absolutely positioned rectangles over a vertical grid (every 25%, or 12.5% when tall). */
export function PianoRoll({ notes, ghost, tall }: { notes: RollNote[]; ghost?: RollNote[]; tall?: boolean }) {
  return (
    <div
      aria-hidden
      className={cx(
        "relative overflow-hidden border border-line-soft bg-bg",
        tall ? "h-[150px] rounded-[9px]" : "h-[50px] rounded-[7px]",
      )}
      style={{
        backgroundImage: `repeating-linear-gradient(90deg, var(--line-soft) 0 1px, transparent 1px ${tall ? "12.5%" : "25%"})`,
      }}
    >
      {ghost?.map((n, i) => <NoteSpan key={`g${i}`} n={n} ghost />)}
      {notes.map((n, i) => (
        <NoteSpan key={i} n={n} />
      ))}
    </div>
  );
}
