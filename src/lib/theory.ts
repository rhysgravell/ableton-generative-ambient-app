// Music theory helpers shared by the UI, the reference tools and the API route.
// Progression rules mirror python/midi/generate_ambient_midi.py.

export const KEYS = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"] as const;
export type Key = (typeof KEYS)[number];

const SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** iv: intervals; m: index of this mode within the parent major scale (pentatonic → minor). */
export const SCALES = {
  minor: { iv: [0, 2, 3, 5, 7, 8, 10], m: 5 },
  dorian: { iv: [0, 2, 3, 5, 7, 9, 10], m: 1 },
  phrygian: { iv: [0, 1, 3, 5, 7, 8, 10], m: 2 },
  lydian: { iv: [0, 2, 4, 6, 7, 9, 11], m: 3 },
  mixolydian: { iv: [0, 2, 4, 5, 7, 9, 10], m: 4 },
  major: { iv: MAJOR, m: 0 },
  pentatonic: { iv: [0, 3, 5, 7, 10], m: 5 },
} as const;
export type Scale = keyof typeof SCALES;
export const SCALE_NAMES = Object.keys(SCALES) as Scale[];

export const MODES = ["major", "dorian", "phrygian", "lydian", "mixolydian", "minor", "locrian"];
export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** The generator's named progressions (PROGRESSIONS in generate_ambient_midi.py). */
export const PRESETS = [
  { id: "drift", prog: "i-VI" },
  { id: "lament", prog: "i-VI-III-VII" },
  { id: "descent", prog: "i-VII-VI-v" },
  { id: "suspended", prog: "i-iv-i-v" },
  { id: "bloom", prog: "i-III-VII-iv" },
  { id: "static", prog: "i" },
] as const;
export type PresetId = (typeof PRESETS)[number]["id"];

export const keyIndex = (k: string) => KEYS.indexOf(k as Key);

/** Spell with flats when the parent major key is F, B♭, E♭, A♭, D♭ or G♭. */
export const prefersFlats = (tonic: number, scale: Scale) =>
  [5, 10, 3, 8, 1, 6].includes((tonic - MAJOR[SCALES[scale].m] + 120) % 12);

export const noteName = (pc: number, flats: boolean) => (flats ? FLATS : SHARPS)[((pc % 12) + 12) % 12];

/** Pitch name with octave, C4 = 60. */
export const pitchName = (midi: number, flats = false) => noteName(midi, flats) + (Math.floor(midi / 12) - 1);

/** "C♯" → "C#" for the scripts' --key flag. */
export const scriptKey = (k: string) => k.replace("♯", "#").replace("♭", "b");

/** "C#"/"C♯" → "Cs", "E♭" → "Eb" for file names. */
export const fileTag = (k: string) => k.replace(/[♯#]/g, "s").replace("♭", "b");

/** The script's note names (C#, Eb…) → display names (C♯, E♭…). */
export const prettyNote = (n: string) => n.replace("#", "♯").replace(/(?<=^[A-G])b/, "♭");

export type ProgItem = { tok: string; ok: true; deg: number; seventh: boolean } | { tok: string; ok: false };

const TOKEN = /^(vii|vi|iv|v|iii|ii|i)(7)?$/i;

export function parseProg(spec: string, scale: Scale): { toks: string[]; items: ProgItem[]; error: string | null } {
  const toks = String(spec ?? "").trim().split(/[\s,\-–—]+/).filter(Boolean);
  if (!toks.length) return { toks, items: [], error: "Type at least one numeral, e.g. i-VI-III-VII." };
  const degrees = SCALES[scale].iv.length;
  const items = toks.map((tok): ProgItem => {
    const m = tok.match(TOKEN);
    if (!m) return { tok, ok: false };
    const deg = ROMAN.indexOf(m[1].toUpperCase());
    return deg < degrees ? { tok, ok: true, deg, seventh: !!m[2] } : { tok, ok: false };
  });
  const bad = items.find((i) => !i.ok);
  let error: string | null = null;
  if (bad) {
    const m = bad.tok.match(TOKEN);
    error = m
      ? `“${bad.tok}” is degree ${ROMAN.indexOf(m[1].toUpperCase()) + 1}, but ${scale} only has ${degrees} notes. Use I–${ROMAN[degrees - 1]}.`
      : `“${bad.tok}” isn't a scale degree. Use I–VII, with an optional trailing 7 — the scale sets each chord's quality, e.g. i-VI-III-VII.`;
  }
  return { toks, items, error };
}

const TRIAD: Record<string, string> = { "4,7": "", "3,7": "m", "3,6": "°", "4,8": "+", "5,7": "sus4", "2,7": "sus2" };
const SEVENTH: Record<string, string> = { ",11": "maj7", ",10": "7", "m,10": "m7", "m,11": "m(maj7)", "°,10": "ø7", "°,9": "°7" };

/** Chord on a degree, stacking every other scale note — as diatonic_chord() does in the generator. */
export function chordName(item: Extract<ProgItem, { ok: true }>, tonic: number, scale: Scale) {
  const iv = SCALES[scale].iv;
  const n = iv.length;
  const ext = (i: number) => iv[i % n] + Math.floor(i / n) * 12;
  const root = ext(item.deg);
  const triad = TRIAD[`${ext(item.deg + 2) - root},${ext(item.deg + 4) - root}`] ?? "sus";
  const suffix = item.seventh ? (SEVENTH[`${triad},${ext(item.deg + 6) - root}`] ?? `${triad}7`) : triad;
  return noteName(tonic + root, prefersFlats(tonic, scale)) + suffix;
}
