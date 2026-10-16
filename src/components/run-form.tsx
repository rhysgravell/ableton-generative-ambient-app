"use client";

import { useState } from "react";
import type { ScriptDef, ScriptOption } from "@/lib/scripts";

type Result =
  | { kind: "file"; url: string; name: string; contents: string[] }
  | { kind: "text"; log: string }
  | { kind: "error"; message: string };

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";

export function RunForm({ scripts }: { scripts: ScriptDef[] }) {
  const [scriptId, setScriptId] = useState(scripts[0].id);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const script = scripts.find((s) => s.id === scriptId) ?? scripts[0];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    if (result?.kind === "file") URL.revokeObjectURL(result.url);
    setResult(null);
    try {
      const res = await fetch("/api/run", { method: "POST", body: new FormData(event.currentTarget) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        setResult({ kind: "error", message: body.error });
      } else if (script.output === "text") {
        setResult({ kind: "text", log: (await res.json()).log });
      } else {
        const name = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "output.mid";
        const contents = res.headers.get("X-Zip-Contents")?.split(",") ?? [];
        setResult({ kind: "file", url: URL.createObjectURL(await res.blob()), name, contents });
      }
    } catch (err) {
      setResult({ kind: "error", message: (err as Error).message });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-6">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Script</span>
        <select
          name="script"
          value={scriptId}
          onChange={(e) => {
            setScriptId(e.target.value);
            setResult(null);
          }}
          className={inputClass}
        >
          {scripts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="block text-xs text-zinc-500">{script.description}</span>
      </label>

      {script.input && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">MIDI file</span>
          <input type="file" name="file" accept=".mid,.midi" required className={inputClass} />
        </label>
      )}

      {/* key resets field values when switching scripts */}
      <fieldset key={script.id} className="grid gap-4 sm:grid-cols-2">
        {script.options.map((opt) => (
          <OptionField key={opt.name} opt={opt} />
        ))}
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Running…" : "Run"}
      </button>

      {result?.kind === "error" && (
        <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {result.message}
        </pre>
      )}
      {result?.kind === "text" && (
        <pre className="overflow-x-auto rounded-md bg-zinc-100 p-4 font-mono text-xs dark:bg-zinc-900">
          {result.log}
        </pre>
      )}
      {result?.kind === "file" && (
        <div className="space-y-2 text-sm">
          <a href={result.url} download={result.name} className="block font-medium underline">
            Download {result.name}
          </a>
          {result.contents.length > 0 && (
            <ul className="list-inside list-disc font-mono text-xs text-zinc-500">
              {result.contents.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

function OptionField({ opt }: { opt: ScriptOption }) {
  switch (opt.kind) {
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name={opt.name} />
          {opt.label}
        </label>
      );
    case "multi":
      return (
        <fieldset className="space-y-1 sm:col-span-2">
          <legend className="text-sm">{opt.label}</legend>
          <div className="flex flex-wrap gap-4">
            {opt.choices.map((choice) => (
              <label key={choice} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={opt.name} value={choice} />
                {choice}
              </label>
            ))}
          </div>
        </fieldset>
      );
    case "select":
      return (
        <label className="block space-y-1">
          <span className="text-sm">{opt.label}</span>
          <select name={opt.name} defaultValue={opt.default} className={inputClass}>
            {opt.choices.map((choice) => (
              <option key={choice}>{choice}</option>
            ))}
          </select>
        </label>
      );
    default:
      return (
        <label className="block space-y-1">
          <span className="text-sm">{opt.label}</span>
          <input
            type={opt.kind}
            name={opt.name}
            step={opt.kind === "number" ? (opt.step ?? "any") : undefined}
            placeholder={opt.placeholder}
            className={inputClass}
          />
        </label>
      );
  }
}
