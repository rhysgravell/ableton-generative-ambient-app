import type { Result } from "@/lib/results";
import { FIELD_LABELS, usesFile, type Tool, type Values } from "@/lib/tools";
import type { Errors } from "@/lib/validate";
import type { LoadedFile } from "../fields/FileField";
import { Band } from "./Band";
import { Report } from "./Report";
import { SingleResult } from "./SingleResult";
import { ZipResult } from "./ZipResult";

export type Phase = "idle" | "running" | "done" | "error";
export type Run = { phase: Phase; n: number; ms?: string; result?: Result };

const IDLE_BODY: Partial<Record<Tool["id"], string>> = {
  ambient: "Run with the defaults or change a setting first. Your clips arrive here as one .zip, listed file by file.",
  drums: "Run it and your drum clips arrive here as one .zip.",
  mutate: "Choose transforms, then run. You get one new .mid back; the original is never changed.",
  rekey:
    "Leave the source on Detect to read it from the notes, or set it if you know it — C major and A minor share every note, so detection can pick either. Same scale both sides is a straight transpose; a new scale moves each note to the matching degree.",
  analyze: "Run it to read tempo, length, notes, velocity and a best guess at the key.",
};

function idleTitle(tool: Tool, file: LoadedFile | null) {
  if (!usesFile(tool.id)) return "Nothing generated yet.";
  return file && !file.bad ? `${file.name} is ready.` : "Bring a MIDI file.";
}

function runningTitle(tool: Tool, v: Values, file: LoadedFile | null) {
  switch (tool.id) {
    case "ambient": {
      const n = (v.parts as string[]).length;
      return `Layering ${n} clip${n === 1 ? "" : "s"}…`;
    }
    case "drums":
      return "Placing hits…";
    case "mutate":
      return "Applying transforms…";
    case "rekey":
      return `Moving to ${v.key} ${v.scale}…`;
    default:
      return `Reading ${file?.name ?? "file"}…`;
  }
}

function skeletonCount(tool: Tool, v: Values) {
  if (tool.id === "ambient") return Math.max(1, (v.parts as string[]).length);
  if (tool.id === "drums") return Math.max(1, (v.patterns as string[]).length);
  return 1;
}

export function ResultPanel({
  tool,
  values,
  file,
  phase,
  run,
  errors,
  result,
  onReuseSeed,
  ref,
}: {
  tool: Tool;
  values: Values;
  file: LoadedFile | null;
  phase: Phase;
  run: Run;
  errors: Errors;
  result: Result | null;
  onReuseSeed: (seed: number) => void;
  ref: React.Ref<HTMLElement>;
}) {
  const live = !!tool.live;
  const errorList = Object.entries(errors);
  const showErrors = errorList.length > 0 && (live || phase === "error");
  const meta = live ? "live" : phase === "running" ? `run ${run.n}` : phase === "done" ? `run ${run.n} · ${run.ms} s` : "";
  const showResult = live ? !showErrors : phase === "done";

  return (
    <section
      ref={ref}
      aria-live="polite"
      aria-label={live ? "Reference" : "Result"}
      className="flex scroll-mt-4 flex-col rounded-2xl border border-line-soft bg-sunk px-[18px] pb-6 pt-5 md:min-h-0 md:min-w-0 md:flex-1 md:overflow-y-auto md:rounded-[18px] md:px-[30px] md:pb-8 md:pt-6"
    >
      <div className="mb-[22px] flex items-center justify-between gap-3">
        <span className="caps">{live ? "Reference" : "Result"}</span>
        <span className="font-mono text-[11.5px] leading-none text-text-3">{meta}</span>
      </div>

      {!live && phase === "idle" && (
        <div className="relative flex min-h-80 flex-1 flex-col justify-end gap-2.5 px-0.5 pb-1.5">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-[30px] -bottom-[30px] top-0 opacity-70 [background-image:repeating-linear-gradient(180deg,transparent_0_13px,var(--line-soft)_13px_14px)] [mask-image:linear-gradient(to_bottom,transparent_10%,black_90%)]"
          />
          <div className="relative max-w-[440px] font-serif text-[27px] font-light italic leading-[1.2] text-pretty text-text">
            {idleTitle(tool, file)}
          </div>
          <div className="relative max-w-[440px] font-sans text-sm leading-[1.6] text-pretty text-text-2">{IDLE_BODY[tool.id]}</div>
        </div>
      )}

      {phase === "running" && (
        <div className="flex flex-col gap-3.5">
          <div className="font-serif text-[26px] font-light italic leading-[1.2] text-text">{runningTitle(tool, values, file)}</div>
          <div className="mb-1.5 font-sans text-[13.5px] leading-normal text-text-3">Usually a second or two. Your settings stay as they are.</div>
          {Array.from({ length: skeletonCount(tool, values) }, (_, i) => (
            <div key={i} className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-line-soft bg-bg p-4">
              <Band delay={i * 0.25} />
              <span className="block h-2.5 w-[46%] rounded bg-line-soft" />
              <span className="block h-[34px] w-full rounded-md bg-line-soft opacity-50" />
            </div>
          ))}
        </div>
      )}

      {showErrors && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="size-[7px] rounded-full bg-err" />
            <span className="caps text-err!">{live ? "Check settings" : "Didn't run"}</span>
          </div>
          <div className="mb-1.5 font-serif text-[28px] font-light leading-[1.2] text-text">
            {errorList.length > 1 ? `${errorList.length} settings need a look.` : "One setting needs a look."}
          </div>
          {errorList.map(([k, msg]) => (
            <div key={k} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-3.5 border-t border-line-soft py-[13px]">
              <span className="font-sans text-[13px] font-medium leading-[1.45] text-text-2">{tool.fields.find((f) => f.id === k)?.label ?? FIELD_LABELS[k] ?? k}</span>
              <span className="font-sans text-[13.5px] leading-[1.45] text-text">{msg}</span>
            </div>
          ))}
          <div className="border-t border-line-soft pt-3 font-sans text-[13px] leading-normal text-text-3">
            Everything else is kept as you left it.
          </div>
        </div>
      )}

      {showResult && result?.kind === "zip" && (
        <ZipResult zip={result} seedLocked={String(values.seed) === String(result.seed)} onReuseSeed={() => onReuseSeed(result.seed)} />
      )}
      {showResult && result?.kind === "single" && <SingleResult single={result} />}
      {showResult && result?.kind === "report" && <Report report={result} />}
    </section>
  );
}
