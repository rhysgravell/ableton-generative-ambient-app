import { TRANSFORM_ORDER, TRANSFORMS, type TransformId, type TransformState } from "@/lib/tools";
import { checkClass, cx } from "../ui";
import { Slider } from "./Basic";
import { stepValue } from "./NumberStepper";

const valueText = (id: TransformId, v: number, kind: string) =>
  id === "transpose" ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}` : kind === "num" ? `×${v}` : v.toFixed(2);

const miniStep = "flex h-full w-8 cursor-pointer items-center justify-center text-text-3 hover:text-text";

export function Transforms({
  tf,
  set,
  error,
}: {
  tf: TransformState;
  set: (id: TransformId, patch: Partial<TransformState[TransformId]>) => void;
  error?: boolean;
}) {
  const active = TRANSFORM_ORDER.filter((id) => tf[id].on);
  const labelOf = (id: TransformId) => TRANSFORMS.find((t) => t.id === id)!.l.toLowerCase();

  return (
    <>
      <div className={cx("flex flex-col rounded-xl border bg-raised", error ? "border-err ring-err" : "border-line-soft")}>
        {TRANSFORMS.map((x, i) => {
          const st = tf[x.id];
          return (
            <div
              key={x.id}
              className={cx("flex min-h-[58px] items-center gap-3 py-[7px] pl-3.5 pr-3", i > 0 && "border-t border-line-soft")}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={st.on}
                onClick={() => set(x.id, { on: !st.on })}
                className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
              >
                <span className={checkClass(st.on)}>{st.on ? "✓" : ""}</span>
                <span className="flex min-w-0 flex-col gap-[3px]">
                  <span className="font-sans text-sm font-medium leading-[1.2] text-text">{x.l}</span>
                  <span className="font-sans text-xs leading-[1.2] text-text-3">{x.s}</span>
                </span>
              </button>

              {st.on && x.kind === "num" && (
                <div className="flex h-9 w-[124px] flex-none items-center rounded-[9px] border border-line bg-bg">
                  <button type="button" aria-label={`Decrease ${x.l}`} className={miniStep} onClick={() => set(x.id, { v: stepValue(x, st.v, -1) })}>
                    −
                  </button>
                  <span className="flex-1 text-center font-mono text-[13.5px] font-medium text-text">{valueText(x.id, st.v, x.kind)}</span>
                  <button type="button" aria-label={`Increase ${x.l}`} className={miniStep} onClick={() => set(x.id, { v: stepValue(x, st.v, 1) })}>
                    +
                  </button>
                </div>
              )}

              {st.on && x.kind === "slider" && (
                <div className="flex w-[124px] flex-none items-center gap-2.5">
                  <Slider label={x.l} value={st.v} min={x.min} max={x.max} step={x.step} onChange={(v) => set(x.id, { v })} />
                  <span className="w-8 text-right font-mono text-[13px] font-medium text-text">{valueText(x.id, st.v, x.kind)}</span>
                </div>
              )}

              {(!st.on || x.kind === "none") && (
                <span className={cx("pr-1.5 font-mono text-xs", st.on ? "text-accent" : "text-text-3")}>{st.on ? "on" : "off"}</span>
              )}
            </div>
          );
        })}
      </div>
      <span className="font-mono text-xs leading-[1.4] text-text-3">
        {active.length ? `applied in order: ${active.map(labelOf).join(" → ")}` : "nothing selected"}
      </span>
    </>
  );
}
