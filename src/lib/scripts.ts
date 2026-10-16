// Registry of the vendored scripts in python/ that the app can run.
// Each entry maps form fields to CLI flags; the API route builds argv from it.
// An option without a flag is passed as a positional argument, in order.

type BaseOption = { name: string; label: string; flag?: string };

export type ScriptOption =
  | (BaseOption & { kind: "number"; step?: number; placeholder?: string })
  | (BaseOption & { kind: "text"; placeholder?: string })
  | (BaseOption & { kind: "boolean"; flag: string })
  | (BaseOption & { kind: "select"; choices: string[]; default: string })
  /** Checkboxes sent as `flag a b c`; omitted when none are ticked so the script default applies. */
  | (BaseOption & { kind: "multi"; flag: string; choices: string[] });

export type ScriptDef = {
  id: string;
  label: string;
  description: string;
  /** Path relative to python/. */
  path: string;
  /** Whether the script takes an uploaded MIDI file as its first argument. */
  input: boolean;
  /**
   * "file": writes one MIDI file via --output <file>.
   * "files": writes MIDI files into --output <dir>, returned as a zip.
   * "text": prints a report to stdout.
   */
  output: "file" | "files" | "text";
  options: ScriptOption[];
};

const KEYS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
const SCALES = ["minor", "dorian", "phrygian", "lydian", "mixolydian", "major", "pentatonic"];

export const SCRIPTS: ScriptDef[] = [
  {
    id: "generate",
    label: "Generate ambient MIDI",
    description: "Chords, melody, bass drone and arp clips that share one chord progression.",
    path: "midi/generate_ambient_midi.py",
    input: false,
    output: "files",
    options: [
      { kind: "select", name: "key", flag: "--key", label: "Key", choices: KEYS, default: "G" },
      { kind: "select", name: "scale", flag: "--scale", label: "Scale", choices: SCALES, default: "minor" },
      { kind: "number", name: "bpm", flag: "--bpm", label: "BPM", step: 1, placeholder: "80" },
      { kind: "number", name: "bars", flag: "--bars", label: "Bars", step: 1, placeholder: "16" },
      {
        kind: "text",
        name: "progression",
        flag: "--progression",
        label: "Progression",
        placeholder: "random · lament · i-VI-III-VII",
      },
      { kind: "number", name: "chordBars", flag: "--chord-bars", label: "Bars per chord", step: 1, placeholder: "2" },
      { kind: "number", name: "seed", flag: "--seed", label: "Seed", step: 1, placeholder: "optional" },
      { kind: "multi", name: "patterns", flag: "--patterns", label: "Patterns (default: all)", choices: ["chords", "melodic", "bass", "arp"] },
    ],
  },
  {
    id: "drums",
    label: "Generate drums",
    description: "Sparse and four-on-the-floor drum clips for a drum rack.",
    path: "midi/generate_drums.py",
    input: false,
    output: "files",
    options: [
      { kind: "number", name: "bpm", flag: "--bpm", label: "BPM", step: 1, placeholder: "80" },
      { kind: "number", name: "bars", flag: "--bars", label: "Bars", step: 1, placeholder: "8" },
      { kind: "number", name: "seed", flag: "--seed", label: "Seed", step: 1, placeholder: "optional" },
      { kind: "multi", name: "patterns", flag: "--patterns", label: "Patterns (default: both)", choices: ["sparse", "four_on_floor"] },
    ],
  },
  {
    id: "mutate",
    label: "Mutate MIDI",
    description: "Transpose, humanize, reverse, stretch or rescale velocities. Transforms stack.",
    path: "midi/mutate_midi.py",
    input: true,
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
    input: true,
    output: "text",
    options: [{ kind: "boolean", name: "verbose", flag: "--verbose", label: "Verbose (note distribution)" }],
  },
  {
    id: "bpm-sync",
    label: "BPM sync calculator",
    description: "Delay times (ms) and LFO rates (Hz) for every common note division.",
    path: "tools/bpm_sync.py",
    input: false,
    output: "text",
    options: [{ kind: "number", name: "bpm", label: "BPM", step: 0.1, placeholder: "80" }],
  },
  {
    id: "scale-explorer",
    label: "Scale explorer",
    description: "Scale notes with MIDI numbers and Hz, diatonic chords and parallel modes.",
    path: "tools/scale_explorer.py",
    input: false,
    output: "text",
    options: [
      { kind: "select", name: "key", label: "Key", choices: KEYS, default: "G" },
      { kind: "select", name: "scale", label: "Scale", choices: SCALES, default: "minor" },
    ],
  },
];

export function getScript(id: string): ScriptDef | undefined {
  return SCRIPTS.find((s) => s.id === id);
}
