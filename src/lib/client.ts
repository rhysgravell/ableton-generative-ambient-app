"use client";

import type { RunError, RunResponse } from "./api-types";
import { toResult, type Result } from "./results";
import type { ToolId, Values } from "./tools";
import type { Errors } from "./validate";

export type RunOutcome = { ok: true; result: Result } | { ok: false; errors: Errors };

export async function runTool(tool: ToolId, values: Values, file: File | null): Promise<RunOutcome> {
  const body = new FormData();
  body.set("tool", tool);
  body.set("values", JSON.stringify(values));
  if (file) body.set("file", file);

  let res: Response;
  try {
    res = await fetch("/api/run", { method: "POST", body });
  } catch {
    return { ok: false, errors: { script: "Couldn't reach the app's server. Is it still running?" } };
  }
  const json = (await res.json().catch(() => null)) as RunResponse | RunError | null;
  if (!json) return { ok: false, errors: { script: `The server answered ${res.status} ${res.statusText}.` } };
  if ("errors" in json) return { ok: false, errors: json.errors };
  return { ok: true, result: toResult(tool, values, json) };
}
