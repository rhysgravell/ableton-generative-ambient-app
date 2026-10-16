import type { Field, TransformId, TransformState, Values } from "@/lib/tools";
import { cx } from "./ui";
import { FieldError, MultiField, SelectField, Slider, TextField, ToggleField } from "./fields/Basic";
import { FileField, type LoadedFile } from "./fields/FileField";
import { NumberStepper } from "./fields/NumberStepper";
import { Progression } from "./fields/Progression";
import { Transforms } from "./fields/Transforms";

export type FieldContext = {
  values: Values;
  set: (patch: Values) => void;
  file: LoadedFile | null;
  onFile: (f: File) => void;
  onSample: () => void;
  onRemoveFile: () => void;
};

export function FieldRenderer({ field: f, error, ctx }: { field: Field; error?: string; ctx: FieldContext }) {
  const v = ctx.values;
  const val = v[f.id];
  const set = (x: unknown) => ctx.set({ [f.id]: x });
  const err = !!error;

  let control: React.ReactNode;
  switch (f.type) {
    case "select":
      control = <SelectField label={f.label} value={String(val)} opts={f.opts} onChange={set} error={err} />;
      break;
    case "number":
      control = <NumberStepper field={f} value={val} onChange={set} error={err} />;
      break;
    case "slider":
      control = (
        <div className="flex items-center gap-2.5">
          <Slider label={f.label} value={Number(val)} min={f.min} max={f.max} step={f.step} onChange={set} />
          <span className="w-10 text-right font-mono text-[13px] font-medium">{Number(val).toFixed(2)}</span>
        </div>
      );
      break;
    case "text":
      control = <TextField label={f.label} value={String(val ?? "")} placeholder={f.ph} onChange={set} error={err} />;
      break;
    case "multi": {
      const arr = val as string[];
      control = (
        <MultiField
          opts={f.opts}
          value={arr}
          error={err}
          onToggle={(x) => set(arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x])}
        />
      );
      break;
    }
    case "toggle":
      control = <ToggleField label={f.label} sub={f.sub} on={!!val} onToggle={() => set(!val)} />;
      break;
    case "progression":
      control = <Progression v={v} set={ctx.set} error={err} />;
      break;
    case "transforms": {
      const tf = val as TransformState;
      control = (
        <Transforms
          tf={tf}
          error={err}
          set={(id: TransformId, patch) => set({ ...tf, [id]: { ...tf[id], ...patch } })}
        />
      );
      break;
    }
    case "file":
      control = (
        <FileField file={ctx.file} error={err} onFile={ctx.onFile} onSample={ctx.onSample} onRemove={ctx.onRemoveFile} />
      );
      break;
  }

  return (
    <div className={cx("flex min-w-0 flex-col gap-[9px]", f.half ? "col-span-1" : "col-span-2")}>
      {f.type !== "toggle" && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-sans text-[13px] font-medium leading-none text-text-2">{f.label}</span>
          {f.hint && <span className="font-mono text-[11.5px] leading-none text-text-3">{f.hint}</span>}
        </div>
      )}
      {control}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
