// The small field types: select, text, multi (CheckCards), toggle, slider, and the inline error.

import type { Option } from "@/lib/tools";
import { boxClass, checkClass, choiceClass, cx, inputReset } from "../ui";

export function SelectField({
  label,
  value,
  opts,
  onChange,
  error,
}: {
  label: string;
  value: string;
  opts: Option[];
  onChange: (v: string) => void;
  error?: boolean;
}) {
  return (
    <div className={boxClass(error)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputReset} h-full flex-1 cursor-pointer appearance-none pl-3.5 pr-[34px] font-sans text-[15px] font-medium`}
      >
        {opts.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3.5 font-mono text-[11px] text-text-3">▾</span>
    </div>
  );
}

export function TextField({
  label,
  value,
  placeholder,
  onChange,
  error,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  return (
    <div className={boxClass(error)}>
      <input
        aria-label={label}
        aria-invalid={error || undefined}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputReset} h-full px-3.5 font-mono text-[15px] font-medium placeholder:text-text-3`}
      />
    </div>
  );
}

export function MultiField({
  opts,
  value,
  onToggle,
  error,
}: {
  opts: Option[];
  value: string[];
  onToggle: (v: string) => void;
  error?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {opts.map((o) => {
        const on = value.includes(o.v);
        return (
          <button
            key={o.v}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(o.v)}
            className={cx(choiceClass(on, error), "flex min-h-[62px] items-start gap-[11px] rounded-xl p-[13px]")}
          >
            <span className={checkClass(on)}>{on ? "✓" : ""}</span>
            <span className="flex min-w-0 flex-col gap-[3px]">
              <span className="font-sans text-sm font-medium leading-[1.2] text-text">{o.l}</span>
              {o.s && <span className="font-sans text-xs leading-[1.3] text-text-3">{o.s}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ToggleField({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex min-h-[60px] cursor-pointer items-center gap-3.5 rounded-xl border border-line-soft bg-raised px-4 py-3 text-left"
    >
      <span className="flex flex-1 flex-col gap-1">
        <span className="font-sans text-sm font-medium text-text">{label}</span>
        <span className="font-sans text-[12.5px] text-text-3">{sub}</span>
      </span>
      <span className={cx("relative h-6 w-10 flex-none rounded-3xl transition-[background] duration-200", on ? "bg-accent" : "bg-line")}>
        <span
          className={cx(
            "absolute top-[3px] size-[18px] rounded-full transition-[left] duration-200",
            on ? "left-[19px] bg-accent-ink" : "left-[3px] bg-text-2",
          )}
        />
      </span>
    </button>
  );
}

/** Custom track with a transparent native range on top, so keyboard and touch still work. */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="control relative flex h-7 flex-1 items-center rounded">
      <div className="absolute inset-x-0 h-1 rounded bg-line" />
      <div className="absolute left-0 h-1 rounded bg-accent" style={{ width: `${pct}%` }} />
      <div
        className="pointer-events-none absolute size-4 rounded-full bg-text shadow-[0_0_0_4px_var(--accent-soft)]"
        style={{ left: `calc(${pct}% - 8px)` }}
      />
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
      />
    </div>
  );
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-[9px] font-sans text-[13px] leading-[1.45] text-pretty text-err">
      <span className="mt-1.5 size-1.5 flex-none rounded-full bg-err" />
      <span>{children}</span>
    </div>
  );
}
