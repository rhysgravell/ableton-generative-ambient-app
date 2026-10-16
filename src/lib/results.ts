// Turns /api/run responses into what the result components render.

import type { Clip, Roll, RunResponse } from "./api-types";
import { analysisReport, barsLabel, type Report } from "./reports";
import { keyIndex, noteName, parseProg, PRESETS, prefersFlats, type Scale } from "./theory";
import { TRANSFORM_ORDER, type ToolId, type TransformState, type Values } from "./tools";

/** A piano-roll note: fractions of the roll's width, a row out of R rows, opacity from velocity. */
export type RollNote = { l: number; w: number; row: number; R: number; op: number };

export type ZipResult = {
  kind: "zip";
  title: string;
  name: string;
  meta: string;
  summary: string[];
  seed: number;
  files: { name: string; meta: string; notes: RollNote[] }[];
  url: string;
};
export type SingleResult = {
  kind: "single";
  name: string;
  meta: string;
  ops: string[];
  ghost: RollNote[];
  notes: RollNote[];
  url: string;
};
export type Result = ZipResult | SingleResult | Report;

export const formatBytes = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${(n / 1024).toFixed(1)} KB`);

function pitchRange(rolls: Roll[]) {
  const pitches = rolls.flatMap((r) => r.notes.map((n) => n[2]));
  return pitches.length ? { min: Math.min(...pitches), max: Math.max(...pitches) } : { min: 60, max: 60 };
}

/** Lay notes out across `span` beats, centring the used pitch range in at least `minRows` rows. */
export function rollNotes(roll: Roll, span: number, range: { min: number; max: number }, minRows = 8): RollNote[] {
  const used = range.max - range.min + 1;
  const R = Math.max(used, minRows);
  const offset = Math.floor((R - used) / 2);
  return roll.notes.map(([start, dur, pitch, vel]) => ({
    l: start / span,
    w: dur / span,
    row: pitch - range.min + offset,
    R,
    op: 0.35 + (0.65 * vel) / 127,
  }));
}

const blobUrl = (base64: string, type: string) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type }));
};

const COUNT_WORDS = ["No clips", "One clip", "Two clips", "Three clips", "Four clips"];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function progressionLabel(v: Values, fromScript: string | null) {
  if (v.progMode === "preset") {
    const p = PRESETS.find((x) => x.id === v.preset) ?? PRESETS[0];
    return `${p.id} · ${p.prog.replace(/-/g, "–")}`;
  }
  if (v.progMode === "random") return `random · ${(fromScript ?? "?").replace(/-/g, "–")}`;
  return parseProg(String(v.progText), v.scale as Scale).toks.join("–");
}

const clipMeta = (c: Clip, bars: number, unit: string) => `${plural(bars, "bar")} · ${plural(c.noteCount, unit)}`;

function transformOps(tf: TransformState) {
  const label: Record<string, (v: number) => string> = {
    transpose: (v) => `transpose ${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)} st`,
    humanize: (v) => `humanize ${v.toFixed(2)}`,
    reverse: () => "reverse",
    stretch: (v) => `stretch ×${v}`,
    velocity: (v) => `velocity ×${v}`,
  };
  return TRANSFORM_ORDER.filter((id) => tf[id].on).map((id) => label[id](tf[id].v));
}

export function toResult(tool: ToolId, v: Values, res: RunResponse): Result {
  if (res.kind === "analysis") return analysisReport(res.analysis, !!v.dist);

  if (res.kind === "single") {
    const span = Math.max(res.before.totalBeats, res.after.totalBeats, 1);
    const range = pitchRange([res.before, res.after]);
    return {
      kind: "single",
      name: res.name,
      meta: `${barsLabel(res.after.totalBeats)} bars · ${plural(res.after.noteCount, "note")} · ${formatBytes(res.bytes)}`,
      ops: transformOps(v.tf as TransformState),
      ghost: rollNotes(res.before, span, range, 16),
      notes: rollNotes(res.after, span, range, 16),
      url: blobUrl(res.data, "audio/midi"),
    };
  }

  const drums = tool === "drums";
  // Generated clips can end just before the last bar line, so lay them out over the requested length.
  const bars = Number(v.bars);
  const files = res.files.map((c) => ({
    name: c.name,
    meta: clipMeta(c, bars, drums ? "hit" : "note"),
    notes: rollNotes(c, Math.max(bars * 4, c.totalBeats, 1), pitchRange([c])),
  }));
  let summary = [`${v.bpm} BPM`, `${v.bars} bars`];
  if (!drums) {
    const t = keyIndex(String(v.key));
    const scale = v.scale as Scale;
    summary = [
      `${noteName(t, prefersFlats(t, scale))} ${scale}`,
      ...summary,
      progressionLabel(v, res.progression),
      `${v.bpc} bars/chord`,
    ];
  }
  return {
    kind: "zip",
    title: drums ? (files.length === 2 ? "Two drum clips" : "One drum clip") : COUNT_WORDS[files.length] ?? plural(files.length, "clip"),
    name: res.name,
    meta: `${plural(files.length, "file")} · ${formatBytes(res.bytes)}`,
    summary,
    seed: res.seed,
    files,
    url: blobUrl(res.data, "application/zip"),
  };
}
