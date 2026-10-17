// Report data for the Report component. The same sections render on screen and as "Copy as text".

import type { Analysis } from "./api-types";
import { keyIndex, MODES, noteName, pitchName, prettyNote, ROMAN, SCALES, prefersFlats, type Scale } from "./theory";
import type { Values } from "./tools";

type Head = { title: string; note?: string };
export type Section =
  | (Head & { type: "head"; big: string; cap: string })
  | (Head & { type: "kv"; rows: { k: string; v: string; n?: string }[] })
  | (Head & { type: "table"; cols: string; align: ("l" | "r")[]; head: string[]; rows: string[][]; highlight?: number })
  | (Head & { type: "bars"; bars: { label: string; count: number }[] });

export type Report = { kind: "report"; title: string; sub: string; sections: Section[] };

const fixed = (x: number, d: number) => x.toFixed(d);

export function bpmReport(v: Values): Report {
  const b = Number(v.bpm);
  const divisions: [string, number][] = [
    ["4 bars", 0.25],
    ["2 bars", 0.5],
    ["1 bar", 1],
    ["1/2", 2],
    ["1/4", 4],
    ["1/8", 8],
    ["1/16", 16],
    ["1/32", 32],
  ];
  const ms = (n: number) => 240000 / b / n;
  const fm = (x: number) => (x >= 100 ? fixed(x, 1) : fixed(x, 2));
  const fh = (x: number) => (x >= 10 ? fixed(x, 2) : fixed(x, 3));
  const table = { type: "table" as const, cols: "4.2rem repeat(3,minmax(0,1fr))", align: ["l", "r", "r", "r"] as ("l" | "r")[] };
  const head = ["Division", "Straight", "Dotted", "Triplet"];
  return {
    kind: "report",
    title: `${b} BPM`,
    sub: "4/4 · dotted = ×1.5 · triplet = ×⅔",
    sections: [
      { type: "head", title: "One beat", big: `${fm(ms(4))} ms`, cap: `1/4 note  ·  ${fh(1000 / ms(4))} Hz` },
      {
        ...table,
        title: "Delay times",
        note: "milliseconds",
        head,
        rows: divisions.map(([l, n]) => [l, fm(ms(n)), fm(ms(n) * 1.5), fm((ms(n) * 2) / 3)]),
        highlight: 4,
      },
      {
        ...table,
        title: "LFO rates",
        note: "hertz · one cycle per division",
        head,
        rows: divisions.map(([l, n]) => [l, fh(1000 / ms(n)), fh(1000 / (ms(n) * 1.5)), fh(1000 / ((ms(n) * 2) / 3))]),
        highlight: 4,
      },
    ],
  };
}

const QUALITY: Record<string, [string, string]> = {
  "4,7": ["major", ""],
  "3,7": ["minor", "m"],
  "3,6": ["diminished", "°"],
  "4,8": ["augmented", "+"],
  "5,7": ["sus4", "sus4"],
  "2,7": ["sus2", "sus2"],
};

export function scaleReport(v: Values): Report {
  const t = keyIndex(String(v.key));
  const s = v.scale as Scale;
  const S = SCALES[s];
  const flats = prefersFlats(t, s);
  const pcs = S.iv.map((i) => t + i);
  const names = pcs.map((p) => noteName(p, flats));
  const N = pcs.length;
  const third = N === 7 ? 2 : 1;
  const fifth = N === 7 ? 4 : 2;

  const noteRows = S.iv.map((iv, i) => {
    const m = 60 + t + iv;
    return [String(i + 1), names[i] + (Math.floor(m / 12) - 1), String(m), fixed(440 * 2 ** ((m - 69) / 12), 2)];
  });
  const chordRows = pcs.map((_, i) => {
    const a = (S.iv[(i + third) % N] - S.iv[i] + 12) % 12;
    const b = (S.iv[(i + fifth) % N] - S.iv[i] + 12) % 12;
    const q = QUALITY[`${a},${b}`] ?? ["open", "5"];
    let num = N === 7 ? ROMAN[i] : String(i + 1);
    if (N === 7 && (q[0] === "minor" || q[0] === "diminished")) num = num.toLowerCase();
    if (q[0] === "diminished") num += "°";
    if (q[0] === "augmented") num += "+";
    const tones = [i, (i + third) % N, (i + fifth) % N].map((k) => names[k]).join(" ");
    return [num, names[i] + q[1], tones, q[0]];
  });
  const modes =
    N === 7
      ? names.map((nm, k) => ({ k: `Degree ${k + 1}`, v: `${nm} ${MODES[(S.m + k) % 7]}`, n: k === 0 ? "this scale" : "" }))
      : [
          { k: "Degree 1", v: `${names[0]} minor pentatonic`, n: "this scale" },
          { k: "Degree 2", v: `${names[1]} major pentatonic`, n: "same five notes" },
        ];

  return {
    kind: "report",
    title: `${names[0]} ${s}`,
    sub: `${N} notes · octave 4 · A4 = 440 Hz`,
    sections: [
      { type: "head", title: "Scale", big: `${names[0]} ${s}`, cap: names.join("  ") },
      {
        type: "table",
        title: "Notes",
        cols: "3.6rem 3.6rem minmax(0,1fr) minmax(0,1fr)",
        align: ["l", "l", "r", "r"],
        head: ["Degree", "Note", "MIDI", "Hz"],
        rows: noteRows,
        highlight: 0,
      },
      {
        type: "table",
        title: "Chords on each degree",
        note: N === 7 ? "triads" : "stacked from the five notes",
        cols: "3.6rem 4.6rem minmax(0,1fr) minmax(0,1fr)",
        align: ["l", "l", "l", "r"],
        head: ["Degree", "Chord", "Notes", "Quality"],
        rows: chordRows,
      },
      { type: "kv", title: "Related modes", note: "same notes, different home", rows: modes },
    ],
  };
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${fixed(sec % 60, 1).padStart(4, "0")}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
/** Bars in 4/4 to one decimal place, dropping a trailing ".0". */
export const barsLabel = (beats: number) => String(Number((beats / 4).toFixed(1)));

export function analysisReport(a: Analysis, dist: boolean): Report {
  const [best, ...alts] = a.keys;
  const keyLabel = (k: Analysis["keys"][number]) => `${prettyNote(k.key)} ${k.scale}`;
  const sections: Section[] = [];

  if (best) {
    sections.push({
      type: "head",
      title: "Best-guess key",
      note: `${Math.round(best.score * 100)}% of notes in scale`,
      big: keyLabel(best),
      cap: alts.length ? `also fits  ${alts.map((k) => `${keyLabel(k)} ${fixed(k.score, 2)}`).join(" · ")}` : "",
    });
  }

  const rows: { k: string; v: string; n?: string }[] = [
    {
      k: "Tempo",
      v: `${fixed(a.bpm, 1)} BPM`,
      n: a.tempoSet ? (a.tempoChanges > 1 ? `average of ${a.tempoChanges} tempo changes` : "from file header") : "no tempo set · default",
    },
    { k: "Time signature", v: a.timeSig ?? "4/4", n: a.timeSig ? "" : "assumed" },
    { k: "Duration", v: clock(a.seconds), n: `${barsLabel(a.totalBeats)} bars` },
    {
      k: "Notes",
      v: String(a.noteCount),
      n: [plural(a.tracks, "track"), a.channels.length ? `channel ${a.channels.join(", ")}` : ""].filter(Boolean).join(" · "),
    },
  ];
  if (a.velocity) rows.push({ k: "Velocity", v: `${a.velocity.min} – ${a.velocity.max}`, n: `mean ${Math.round(a.velocity.mean)}` });
  if (a.pitch) {
    rows.push({
      k: "Pitch range",
      v: `${pitchName(a.pitch.min)} – ${pitchName(a.pitch.max)}`,
      n: plural(a.pitch.max - a.pitch.min, "semitone"),
    });
  }
  sections.push({ type: "kv", title: "Summary", rows });

  if (dist && a.noteCount) {
    sections.push({
      type: "bars",
      title: "Note distribution",
      note: "count per pitch class",
      bars: a.pitchClasses.map((count, pc) => ({ label: noteName(pc, false), count })),
    });
  }

  return { kind: "report", title: "Analysis", sub: a.name, sections };
}

export function reportText(rep: Report): string {
  const lines = [rep.title.toUpperCase(), rep.sub, ""];
  for (const sec of rep.sections) {
    lines.push(`— ${sec.title} —`);
    if (sec.type === "head") lines.push(sec.big, sec.cap);
    if (sec.type === "kv") sec.rows.forEach((r) => lines.push(`${r.k.padEnd(16)} ${r.v}${r.n ? `  (${r.n})` : ""}`));
    if (sec.type === "table") {
      [sec.head, ...sec.rows].forEach((row) =>
        lines.push(row.map((c, i) => (i ? c.padStart(12) : c.padEnd(10))).join("")),
      );
    }
    if (sec.type === "bars") {
      const max = Math.max(1, ...sec.bars.map((b) => b.count));
      sec.bars.forEach((b) => lines.push(`${b.label.padEnd(4)} ${"█".repeat(Math.round((b.count / max) * 24))} ${b.count}`));
    }
    lines.push("");
  }
  return lines.join("\n");
}
