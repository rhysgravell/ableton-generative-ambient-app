import type { NumberField } from "@/lib/tools";
import { boxClass, inputReset } from "../ui";

const decimals = (step: number) => (String(step).split(".")[1] ?? "").length;

/** Clamp and snap to the field's step. */
export function stepValue(f: { min: number; max: number; step: number }, current: unknown, dir: -1 | 1) {
  const cur = parseFloat(String(current));
  const next = Number.isNaN(cur) ? f.min : cur + dir * f.step;
  const snapped = Math.round(next / f.step) * f.step;
  return Number(Math.max(f.min, Math.min(f.max, snapped)).toFixed(decimals(f.step)));
}

const stepButton =
  "flex h-full w-10 flex-none cursor-pointer items-center justify-center font-sans text-lg text-text-3 hover:bg-hover hover:text-text";

export function NumberStepper({
  field,
  value,
  onChange,
  error,
}: {
  field: NumberField;
  value: unknown;
  onChange: (v: string | number) => void;
  error?: boolean;
}) {
  return (
    <div className={boxClass(error)}>
      <button type="button" aria-label={`Decrease ${field.label}`} className={stepButton} onClick={() => onChange(stepValue(field, value, -1))}>
        −
      </button>
      <input
        aria-label={field.label}
        aria-invalid={error || undefined}
        value={String(value)}
        inputMode="decimal"
        onChange={(e) => onChange(e.target.value.replace(/[^\d.\-]/g, ""))}
        className={`${inputReset} p-0 text-right font-mono text-[15px] font-medium`}
      />
      <span className="min-w-[30px] pl-1.5 font-sans text-xs text-text-3">{field.unit}</span>
      <button type="button" aria-label={`Increase ${field.label}`} className={stepButton} onClick={() => onChange(stepValue(field, value, 1))}>
        +
      </button>
    </div>
  );
}
