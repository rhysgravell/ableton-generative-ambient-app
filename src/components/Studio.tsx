"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runTool } from "@/lib/client";
import { bpmReport, scaleReport } from "@/lib/reports";
import { formatBytes, type Result } from "@/lib/results";
import { cloneDefaults, TOOL_BY_ID, TOOLS, type ToolId, type Values } from "@/lib/tools";
import { isMidiName, liveErrors, validate, type Errors } from "@/lib/validate";
import { FieldRenderer, type FieldContext } from "./FieldRenderer";
import type { LoadedFile } from "./fields/FileField";
import { ResultPanel, type Run } from "./result/ResultPanel";
import { RunBar } from "./RunBar";
import { Rail } from "./shell/Rail";
import { MobileTop } from "./shell/ToolPicker";
import { Welcome } from "./shell/Welcome";

type PerTool<T> = Partial<Record<ToolId, T>>;

const SAMPLE = { path: "/samples/night_pads_v2.mid", name: "night_pads_v2.mid" };
const FILE_TOOLS: ToolId[] = ["mutate", "analyze"];
const PROGRESSION_KEYS = ["progMode", "progText", "preset", "scale"];

const allDefaults = () => Object.fromEntries(TOOLS.map((t) => [t.id, cloneDefaults(t.id)])) as Record<ToolId, Values>;

function loadFile(file: File): LoadedFile {
  const bad = !isMidiName(file.name);
  const size = formatBytes(file.size);
  return { file, name: file.name, meta: `${size} · ${bad ? "not MIDI" : "MIDI"}`, bad };
}

function revoke(result: Result | undefined) {
  if (result && "url" in result) URL.revokeObjectURL(result.url);
}

export function Studio() {
  const [tool, setTool] = useState<ToolId | null>(null);
  const [vals, setVals] = useState(allDefaults);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [runs, setRuns] = useState<PerTool<Run>>({});
  const [errs, setErrs] = useState<PerTool<Errors>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const resultRef = useRef<HTMLElement>(null);

  const select = (id: ToolId) => {
    setTool(id);
    setMenuOpen(false);
  };

  const patchValues = useCallback(
    (patch: Values) => {
      if (!tool) return;
      setVals((s) => ({ ...s, [tool]: { ...s[tool], ...patch } }));
      // Editing a field clears its run-time error (and any script error, which may no longer apply).
      setErrs((s) => {
        const e = { ...s[tool] };
        delete e.script;
        for (const k of Object.keys(patch)) {
          delete e[k];
          if (PROGRESSION_KEYS.includes(k)) delete e.progression;
        }
        return { ...s, [tool]: e };
      });
    },
    [tool],
  );

  const clearFileErrors = () =>
    setErrs((s) => {
      const next = { ...s };
      for (const t of FILE_TOOLS) {
        const e = { ...next[t] };
        delete e.file;
        delete e.script;
        next[t] = e;
      }
      return next;
    });

  const acceptFile = (f: File) => {
    setFile(loadFile(f));
    clearFileErrors();
  };

  const loadSample = async () => {
    const res = await fetch(SAMPLE.path);
    acceptFile(new File([await res.blob()], SAMPLE.name, { type: "audio/midi" }));
  };

  const run = useCallback(async () => {
    if (!tool || TOOL_BY_ID[tool].live) return;
    const t = tool;
    const prev = runs[t] ?? { phase: "idle", n: 0 };
    if (prev.phase === "running") return;
    const v = vals[t];

    const errors = validate(t, v, file);
    if (Object.keys(errors).length) {
      setErrs((s) => ({ ...s, [t]: errors }));
      setRuns((s) => ({ ...s, [t]: { ...prev, phase: "error" } }));
      return;
    }

    const n = prev.n + 1;
    setErrs((s) => ({ ...s, [t]: {} }));
    setRuns((s) => ({ ...s, [t]: { ...prev, phase: "running", n } }));
    const started = performance.now();
    const outcome = await runTool(t, v, FILE_TOOLS.includes(t) ? (file?.file ?? null) : null);
    const ms = ((performance.now() - started) / 1000).toFixed(1);

    if (!outcome.ok) {
      setErrs((s) => ({ ...s, [t]: outcome.errors }));
      setRuns((s) => ({ ...s, [t]: { ...prev, phase: "error", n } }));
      return;
    }
    revoke(prev.result);
    setRuns((s) => ({ ...s, [t]: { phase: "done", n, ms, result: outcome.result } }));
    if (window.matchMedia("(max-width: 767px)").matches) {
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [tool, runs, vals, file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  const reset = () => {
    if (!tool) return;
    setVals((s) => ({ ...s, [tool]: cloneDefaults(tool) }));
    setErrs((s) => ({ ...s, [tool]: {} }));
  };

  const T = tool ? TOOL_BY_ID[tool] : null;
  const v = tool ? vals[tool] : null;
  const runState: Run = (tool && runs[tool]) || { phase: "idle", n: 0 };
  const errors: Errors = tool && v ? { ...liveErrors(tool, v, file), ...errs[tool] } : {};
  const hasErrors = Object.keys(errors).length > 0;

  // Once every error is fixed, fall back to the previous result (or idle).
  let phase = runState.phase;
  if (phase === "error" && !hasErrors) phase = runState.result ? "done" : "idle";

  let result: Result | null = runState.result ?? null;
  if (tool === "bpmsync" && v && !hasErrors) result = bpmReport(v);
  if (tool === "scales" && v && !hasErrors) result = scaleReport(v);

  const ctx: FieldContext | null = v
    ? {
        values: v,
        set: patchValues,
        file,
        onFile: acceptFile,
        onSample: loadSample,
        onRemoveFile: () => setFile(null),
      }
    : null;

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-[radial-gradient(1100px_520px_at_88%_-12%,var(--glow),transparent_62%),var(--bg)] text-text md:h-dvh md:flex-row md:overflow-hidden">
      <Rail tool={tool} onSelect={select} onHome={() => setTool(null)} />

      <main className={`flex flex-col md:min-h-0 md:min-w-0 md:flex-1 ${tool ? "md:overflow-hidden" : "md:overflow-y-auto"}`}>
        <MobileTop tool={tool} open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} onSelect={select} />

        {!T && <Welcome onSelect={select} />}

        {T && v && ctx && (
          <>
            <header className="flex flex-col gap-3 px-[18px] pb-5 pt-6 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-6 md:px-10 md:pb-6 md:pt-[30px]">
              <div className="flex min-w-0 max-w-[640px] flex-col gap-2">
                <span className="caps">{T.group}</span>
                <h1 className="font-serif text-[30px] font-light leading-[1.05] tracking-[-0.01em] text-text md:text-[38px]">{T.name}</h1>
                <p className="font-sans text-[14.5px] leading-[1.55] text-pretty text-text-2">{T.blurb}</p>
              </div>
              <span className="whitespace-nowrap font-mono text-xs leading-[1.4] text-text-3">
                returns <span className="text-text-2">{T.outLong}</span>
              </span>
            </header>

            <div className="flex flex-col gap-[18px] px-[18px] pb-7 md:min-h-0 md:flex-1 md:flex-row md:gap-7 md:px-10">
              <section aria-label="Settings" className="flex flex-col md:min-h-0 md:w-[396px] md:flex-none">
                <div className="pb-2 md:-ml-0.5 md:-mr-2.5 md:min-h-0 md:flex-1 md:overflow-y-auto md:pb-[26px] md:pl-0.5 md:pr-2.5 md:pt-1">
                  <div className="grid grid-cols-2 gap-x-3.5 gap-y-[22px]">
                    {T.fields.map((f) => (
                      <FieldRenderer key={f.id} field={f} error={errors[f.id]} ctx={ctx} />
                    ))}
                  </div>
                </div>
                {T.live ? (
                  <div className="flex items-center gap-2.5 pt-[18px] font-sans text-[12.5px] text-text-3">
                    <span className="halo size-1.5 rounded-full bg-accent" />
                    Updates as you change settings — no run needed.
                  </div>
                ) : (
                  <RunBar tool={T} running={phase === "running"} done={phase === "done"} onRun={run} onReset={reset} />
                )}
              </section>

              <ResultPanel
                ref={resultRef}
                tool={T}
                values={v}
                file={file}
                phase={phase}
                run={runState}
                errors={errors}
                result={result}
                onReuseSeed={(seed) => patchValues({ seed: String(v.seed) === String(seed) ? "" : String(seed) })}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
