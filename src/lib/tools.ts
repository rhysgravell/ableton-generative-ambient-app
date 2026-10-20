// Tool registry. Each tool is data: adding a script means adding an entry here
// (plus a case in handle() in src/app/api/run/route.ts), and a custom field type only when truly bespoke.

import { KEYS, SCALE_NAMES } from "./theory";

export type ToolId = "ambient" | "drums" | "mutate" | "rekey" | "analyze" | "bpmsync" | "scales";
export type Group = "Generate" | "Transform" | "Reference";
export type Option = { v: string; l: string; s?: string };

type Base = { id: string; label: string; hint?: string; half?: boolean };
export type NumberField = Base & { type: "number"; unit: string; min: number; max: number; step: number };
export type SelectField = Base & { type: "select"; opts: Option[] };
export type SliderField = Base & { type: "slider"; min: number; max: number; step: number };
export type Field =
  | SelectField
  | NumberField
  | SliderField
  | (Base & { type: "text"; ph?: string })
  | (Base & { type: "multi"; opts: Option[] })
  | (Base & { type: "toggle"; sub: string })
  | (Base & { type: "file" })
  | (Base & { type: "progression" })
  | (Base & { type: "transforms" });

export type TransformId = "transpose" | "humanize" | "reverse" | "stretch" | "velocity";
export type TransformState = Record<TransformId, { on: boolean; v: number }>;
export type Values = Record<string, unknown>;

export type Tool = {
  id: ToolId;
  group: Group;
  name: string;
  blurb: string;
  out: ".zip" | ".mid" | "report" | "table";
  outLong: string;
  verb?: string;
  busy?: string;
  /** Reference tools recompute on every change; no Run. */
  live?: boolean;
  fields: Field[];
  defaults: Values;
};

export const GROUPS: { label: Group; sub: string }[] = [
  { label: "Generate", sub: "new MIDI from settings" },
  { label: "Transform", sub: "reshape a file" },
  { label: "Reference", sub: "quick lookups" },
];

const bpm: NumberField = { id: "bpm", type: "number", label: "Tempo", unit: "BPM", min: 20, max: 300, step: 1, half: true };
const bars: NumberField = { id: "bars", type: "number", label: "Length", unit: "bars", min: 1, max: 256, step: 1, half: true };
const key: SelectField = { id: "key", type: "select", label: "Key", opts: KEYS.map((k) => ({ v: k, l: k })), half: true };
const scale: SelectField = {
  id: "scale",
  type: "select",
  label: "Scale",
  opts: SCALE_NAMES.map((s) => ({ v: s, l: s[0].toUpperCase() + s.slice(1) })),
  half: true,
};
/** Change key's source: a key or scale, or "auto" to detect it from the notes. */
export const DETECT = "auto";
const detectOpt: Option = { v: DETECT, l: "Detect" };
const seed: Field = { id: "seed", type: "text", label: "Seed", hint: "optional", ph: "random", half: true };

/** Mutate's transforms, listed in UI order. */
export const TRANSFORMS: (
  | { id: TransformId; l: string; s: string; kind: "num"; min: number; max: number; step: number }
  | { id: TransformId; l: string; s: string; kind: "slider"; min: number; max: number; step: number }
  | { id: TransformId; l: string; s: string; kind: "none" }
)[] = [
  { id: "transpose", l: "Transpose", s: "semitones", kind: "num", min: -24, max: 24, step: 1 },
  { id: "humanize", l: "Humanize", s: "timing & velocity drift, 0–1", kind: "slider", min: 0, max: 1, step: 0.05 },
  { id: "reverse", l: "Reverse", s: "play backwards", kind: "none" },
  { id: "stretch", l: "Time-stretch", s: "× length", kind: "num", min: 0.25, max: 8, step: 0.25 },
  { id: "velocity", l: "Velocity scale", s: "× velocity", kind: "num", min: 0.1, max: 2, step: 0.05 },
];
/** The order mutate_midi.py actually applies them in. */
export const TRANSFORM_ORDER: TransformId[] = ["reverse", "stretch", "transpose", "velocity", "humanize"];

export const TOOLS: Tool[] = [
  {
    id: "ambient",
    group: "Generate",
    name: "Ambient generator",
    blurb: "Up to four clips on one shared progression — slow pads, a stepwise melody, a bass drone and an arpeggio.",
    out: ".zip",
    outLong: "a .zip of MIDI clips",
    verb: "Generate clips",
    busy: "Generating",
    fields: [
      key,
      scale,
      bpm,
      bars,
      { id: "progression", type: "progression", label: "Chord progression" },
      { id: "bpc", type: "number", label: "Bars per chord", unit: "bars", min: 1, max: 16, step: 1, half: true },
      seed,
      {
        id: "parts",
        type: "multi",
        label: "Parts",
        hint: "at least one",
        opts: [
          { v: "chords", l: "Chord pads", s: "slow, sustained" },
          { v: "melodic", l: "Melody", s: "stepwise" },
          { v: "bass", l: "Bass drone", s: "root, held" },
          { v: "arp", l: "Arpeggio", s: "broken chords" },
        ],
      },
    ],
    defaults: {
      key: "G",
      scale: "minor",
      bpm: 80,
      bars: 16,
      progMode: "preset",
      preset: "drift",
      progText: "i-VI-III-VII",
      bpc: 4,
      seed: "",
      parts: ["chords", "melodic", "bass", "arp"],
    },
  },
  {
    id: "drums",
    group: "Generate",
    name: "Drum generator",
    blurb: "Sparse and four-on-the-floor drum clips at your tempo.",
    out: ".zip",
    outLong: "a .zip of MIDI clips",
    verb: "Generate drums",
    busy: "Generating",
    fields: [
      bpm,
      bars,
      { ...seed, half: false },
      {
        id: "patterns",
        type: "multi",
        label: "Patterns",
        hint: "at least one",
        opts: [
          { v: "sparse", l: "Sparse", s: "kick, rim, air" },
          { v: "four_on_floor", l: "Four on the floor", s: "steady kick, offbeat hats" },
        ],
      },
    ],
    defaults: { bpm: 80, bars: 16, seed: "", patterns: ["sparse", "four_on_floor"] },
  },
  {
    id: "mutate",
    group: "Transform",
    name: "Mutate",
    blurb: "Stack transpose, humanize, reverse, stretch and velocity changes onto a MIDI file.",
    out: ".mid",
    outLong: "one .mid file",
    verb: "Mutate file",
    busy: "Mutating",
    fields: [
      { id: "file", type: "file", label: "MIDI file" },
      { id: "tf", type: "transforms", label: "Transforms", hint: "stack · pick one or more" },
      { ...seed, hint: "optional · humanize" },
    ],
    defaults: {
      seed: "",
      tf: {
        transpose: { on: true, v: -3 },
        humanize: { on: true, v: 0.35 },
        reverse: { on: false, v: 0 },
        stretch: { on: false, v: 2 },
        velocity: { on: false, v: 0.8 },
      } satisfies TransformState,
    },
  },
  {
    id: "rekey",
    group: "Transform",
    name: "Change key",
    blurb: "Move a MIDI file into another key and scale. Each note keeps its place in the scale, so major to minor sounds written that way.",
    out: ".mid",
    outLong: "one .mid file",
    verb: "Change key",
    busy: "Changing key",
    fields: [
      { id: "file", type: "file", label: "MIDI file" },
      { ...key, id: "fromKey", label: "From key", opts: [detectOpt, ...key.opts] },
      { ...scale, id: "fromScale", label: "From scale", opts: [detectOpt, ...scale.opts] },
      { ...key, label: "To key" },
      { ...scale, label: "To scale" },
    ],
    defaults: { fromKey: DETECT, fromScale: DETECT, key: "G", scale: "minor" },
  },
  {
    id: "analyze",
    group: "Transform",
    name: "Analyze",
    blurb: "Read a MIDI file: tempo, length, notes, velocity and a best guess at key and scale.",
    out: "report",
    outLong: "a text report",
    verb: "Analyze file",
    busy: "Reading",
    fields: [
      { id: "file", type: "file", label: "MIDI file" },
      { id: "dist", type: "toggle", label: "Note distribution", sub: "Add a count per pitch class to the report" },
    ],
    defaults: { dist: true },
  },
  {
    id: "bpmsync",
    group: "Reference",
    name: "BPM sync",
    blurb: "Delay times and LFO rates for every note division at one tempo.",
    out: "table",
    outLong: "tables",
    live: true,
    fields: [bpm],
    defaults: { bpm: 80 },
  },
  {
    id: "scales",
    group: "Reference",
    name: "Scale explorer",
    blurb: "Notes, frequencies, the chord on each degree and related modes for any key.",
    out: "table",
    outLong: "tables",
    live: true,
    fields: [key, scale],
    defaults: { key: "G", scale: "minor" },
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, Tool>;

/** Tools that take an uploaded MIDI file (the file is shared between them). */
export const usesFile = (id: ToolId) => TOOL_BY_ID[id].fields.some((f) => f.type === "file");

export const isToolId = (id: string): id is ToolId => id in TOOL_BY_ID;

/** Labels for the error summary, keyed by field id. */
export const FIELD_LABELS: Record<string, string> = {
  progression: "Progression",
  parts: "Parts",
  patterns: "Patterns",
  file: "MIDI file",
  tf: "Transforms",
  seed: "Seed",
  bpm: "Tempo",
  bars: "Length",
  bpc: "Bars per chord",
  key: "Key",
  scale: "Scale",
  fromKey: "From key",
  fromScale: "From scale",
  script: "Script",
};

export const cloneDefaults = (id: ToolId): Values => structuredClone(TOOL_BY_ID[id].defaults);
