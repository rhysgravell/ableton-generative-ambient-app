// Validation shared by the client (live + on Run) and the API route.

import { PRESETS, parseProg, SCALES, type PresetId, type Scale } from "./theory";
import { TOOL_BY_ID, type ToolId, type TransformState, type Values } from "./tools";

export type FileInfo = { name: string; bad: boolean };
export type Errors = Record<string, string>;

const AUDIO = ["wav", "mp3", "aif", "aiff", "flac", "ogg", "m4a"];

export const isMidiName = (name: string) => /\.midi?$/i.test(name);

export function badFileMessage(name: string) {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  return AUDIO.includes(ext)
    ? `“${name}” is audio, not MIDI. Export the part as a .mid from your music software and drop that instead.`
    : `“${name}” isn't a MIDI file. Drop a .mid or .midi file.`;
}

/** The progression spec the generator will receive, or null for random. */
export function progressionSpec(v: Values): string | null {
  if (v.progMode === "random") return null;
  if (v.progMode === "preset") return PRESETS.find((p) => p.id === v.preset)?.prog ?? PRESETS[0].prog;
  return String(v.progText ?? "");
}

function progressionError(v: Values): string | null {
  const spec = progressionSpec(v);
  if (spec === null) return null;
  const scale = v.scale as Scale;
  const { error } = parseProg(spec, scale);
  if (!error || v.progMode !== "preset") return error;
  const degrees = SCALES[scale].iv.length;
  const fits = PRESETS.filter((p) => !parseProg(p.prog, scale).error).map((p) => p.id);
  return `“${v.preset as PresetId}” goes beyond degree ${degrees}, and ${scale} only has ${degrees} notes. Try ${fits.join(" or ")}, or type numerals.`;
}

/** Errors shown as you type. */
export function liveErrors(tool: ToolId, v: Values, file: FileInfo | null): Errors {
  const e: Errors = {};
  for (const f of TOOL_BY_ID[tool].fields) {
    if (f.type !== "number") continue;
    const raw = v[f.id];
    const n = Number(raw);
    if (raw === "" || raw === null || Number.isNaN(n) || n < f.min || n > f.max) {
      e[f.id] = `Use a value from ${f.min} to ${f.max}.`;
    }
  }
  if ("seed" in v && v.seed !== "" && !/^\d+$/.test(String(v.seed).trim())) {
    e.seed = "Seeds are whole numbers, e.g. 4127.";
  }
  if (tool === "ambient") {
    const pe = progressionError(v);
    if (pe) e.progression = pe;
    if (!e.bpc && !e.bars && Number(v.bpc) > Number(v.bars)) e.bpc = `Longer than the whole piece (${v.bars} bars).`;
  }
  if ((tool === "mutate" || tool === "analyze") && file?.bad) e.file = badFileMessage(file.name);
  return e;
}

/** Everything checked on Run (and again by the API). */
export function validate(tool: ToolId, v: Values, file: FileInfo | null): Errors {
  const e = liveErrors(tool, v, file);
  if (tool === "ambient" && !(v.parts as string[]).length) e.parts = "Pick at least one part to generate.";
  if (tool === "drums" && !(v.patterns as string[]).length) e.patterns = "Pick at least one pattern.";
  if ((tool === "mutate" || tool === "analyze") && !file) e.file = "Add a MIDI file first.";
  if (tool === "mutate" && !Object.values(v.tf as TransformState).some((t) => t.on)) {
    e.tf = "Turn on at least one transform. They stack, so any combination works.";
  }
  return e;
}
