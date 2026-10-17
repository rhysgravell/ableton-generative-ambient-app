import { cx } from "../ui";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: { v: T; l: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx("grid rounded-[11px] border border-line-soft bg-sunk p-[3px]", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.v === value;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.v)}
            className={cx(
              "h-8 cursor-pointer rounded-lg text-center font-sans text-[13px] font-medium leading-8",
              on ? "bg-raised text-text shadow-[0_1px_0_var(--line-soft),inset_0_0_0_1px_var(--line-soft)]" : "text-text-3",
            )}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
