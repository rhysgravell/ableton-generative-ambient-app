// Registry of scripts from the ableton-generative-ambient repo that the app can run.
// Each entry maps form fields to CLI flags; the API route builds argv from it.

export type ScriptOption =
  | { kind: "number"; name: string; flag: string; label: string; step?: number; placeholder?: string }
  | { kind: "boolean"; name: string; flag: string; label: string };

export type ScriptDef = {
  id: string;
  label: string;
  description: string;
  /** Path relative to the scripts repo root. */
  path: string;
  /** "file": writes a new MIDI file via --output. "text": prints a report to stdout. */
  output: "file" | "text";
  options: ScriptOption[];
};

export const SCRIPTS: ScriptDef[] = [
  {
    id: "mutate",
    label: "Mutate MIDI",
    description: "Transpose, humanize, reverse, stretch or rescale velocities. Transforms stack.",
    path: "midi/mutate_midi.py",
    output: "file",
    options: [
      { kind: "number", name: "transpose", flag: "--transpose", label: "Transpose (semitones)", step: 1, placeholder: "e.g. -2" },
      { kind: "number", name: "humanize", flag: "--humanize", label: "Humanize (0–1)", step: 0.05, placeholder: "e.g. 0.35" },
      { kind: "boolean", name: "reverse", flag: "--reverse", label: "Reverse" },
      { kind: "number", name: "stretch", flag: "--stretch", label: "Stretch factor", step: 0.1, placeholder: "e.g. 1.5" },
      { kind: "number", name: "velocityScale", flag: "--velocity-scale", label: "Velocity scale", step: 0.05, placeholder: "e.g. 0.8" },
      { kind: "number", name: "seed", flag: "--seed", label: "Seed", step: 1, placeholder: "optional" },
    ],
  },
  {
    id: "analyze",
    label: "Analyze MIDI",
    description: "BPM, duration, note count, velocity range and best-fit key/scale.",
    path: "midi/analyze_midi.py",
    output: "text",
    options: [{ kind: "boolean", name: "verbose", flag: "--verbose", label: "Verbose (note distribution)" }],
  },
];

export function getScript(id: string): ScriptDef | undefined {
  return SCRIPTS.find((s) => s.id === id);
}
