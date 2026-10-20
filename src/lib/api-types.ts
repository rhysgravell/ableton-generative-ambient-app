// Contract between /api/run and the client.

import type { Errors } from "./validate";

/** [startBeat, durationBeats, pitch, velocity] */
export type Note = [number, number, number, number];
export type Roll = { totalBeats: number; notes: Note[] };
export type Clip = Roll & { name: string; noteCount: number };

export type Analysis = {
  name: string;
  bpm: number;
  tempoSet: boolean;
  tempoChanges: number;
  timeSig: string | null;
  seconds: number;
  totalBeats: number;
  noteCount: number;
  tracks: number;
  channels: number[];
  velocity: { min: number; max: number; mean: number } | null;
  pitch: { min: number; max: number } | null;
  pitchClasses: number[];
  keys: { key: string; scale: string; score: number }[];
};

/** What change_key.py did. Keys use the scripts' spelling (C#, Eb…). */
export type KeyChange = {
  from: { key: string; scale: string; detected: boolean; score: number };
  to: { key: string; scale: string };
  shift: number;
};

export type RunResponse =
  | { kind: "zip"; name: string; bytes: number; seed: number; progression: string | null; files: Clip[]; data: string }
  | { kind: "single"; name: string; bytes: number; seed: number | null; before: Clip; after: Clip; data: string; keyChange?: KeyChange }
  | { kind: "analysis"; analysis: Analysis };

export type RunError = { errors: Errors };
