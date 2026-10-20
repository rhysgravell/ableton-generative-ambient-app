import { describe, expect, it } from "vitest";
import { cloneDefaults, type TransformState, type Values } from "./tools";
import { badFileMessage, isMidiName, liveErrors, progressionSpec, validate } from "./validate";

const ambient = (patch: Values = {}) => ({ ...cloneDefaults("ambient"), ...patch });
const midi = { name: "loop.mid", bad: false };

describe("progressionSpec", () => {
  it("returns the preset's numerals, the typed text, or null for random", () => {
    expect(progressionSpec(ambient({ progMode: "preset", preset: "lament" }))).toBe("i-VI-III-VII");
    expect(progressionSpec(ambient({ progMode: "numerals", progText: "i-iv" }))).toBe("i-iv");
    expect(progressionSpec(ambient({ progMode: "random" }))).toBeNull();
  });
});

describe("liveErrors", () => {
  it("passes every tool's defaults", () => {
    expect(liveErrors("ambient", ambient(), null)).toEqual({});
    expect(liveErrors("drums", cloneDefaults("drums"), null)).toEqual({});
    expect(liveErrors("mutate", cloneDefaults("mutate"), midi)).toEqual({});
    expect(liveErrors("rekey", cloneDefaults("rekey"), midi)).toEqual({});
  });

  it("checks number ranges", () => {
    expect(liveErrors("ambient", ambient({ bpm: 400 }), null).bpm).toBe("Use a value from 20 to 300.");
    expect(liveErrors("ambient", ambient({ bars: "" }), null).bars).toBe("Use a value from 1 to 256.");
  });

  it("wants whole-number seeds, or none", () => {
    expect(liveErrors("ambient", ambient({ seed: "4127" }), null).seed).toBeUndefined();
    expect(liveErrors("ambient", ambient({ seed: "4.5" }), null).seed).toMatch(/whole numbers/);
  });

  it("won't let one chord outlast the piece", () => {
    expect(liveErrors("ambient", ambient({ bars: 4, bpc: 8 }), null).bpc).toBe("Longer than the whole piece (4 bars).");
  });

  it("flags bad typed numerals", () => {
    expect(liveErrors("ambient", ambient({ progMode: "numerals", progText: "i-VIII" }), null).progression).toMatch(/isn't a scale degree/);
  });

  it("suggests the presets that fit a pentatonic scale", () => {
    const e = liveErrors("ambient", ambient({ scale: "pentatonic", progMode: "preset", preset: "lament" }), null);
    expect(e.progression).toBe("“lament” goes beyond degree 5, and pentatonic only has 5 notes. Try suspended or static, or type numerals.");
  });

  it("skips progression checks in random mode", () => {
    expect(liveErrors("ambient", ambient({ scale: "pentatonic", progMode: "random", preset: "lament" }), null)).toEqual({});
  });

  it("explains a dropped audio file", () => {
    expect(liveErrors("analyze", {}, { name: "pad.wav", bad: true }).file).toMatch(/is audio, not MIDI/);
  });
});

describe("validate", () => {
  it("needs something to generate", () => {
    expect(validate("ambient", ambient({ parts: [] }), null).parts).toBeDefined();
    expect(validate("drums", { ...cloneDefaults("drums"), patterns: [] }, null).patterns).toBeDefined();
  });

  it("needs a file for every file tool", () => {
    for (const tool of ["mutate", "rekey", "analyze"] as const) {
      expect(validate(tool, cloneDefaults(tool), null).file).toBe("Add a MIDI file first.");
    }
  });

  it("won't change a key into itself", () => {
    const v = { ...cloneDefaults("rekey"), fromKey: "G", fromScale: "minor" };
    expect(validate("rekey", v, midi).key).toBe("The file is already in G minor. Pick a different key or scale to move to.");
    expect(validate("rekey", { ...v, fromScale: "major" }, midi)).toEqual({});
  });

  it("needs at least one transform on", () => {
    const v = cloneDefaults("mutate");
    for (const t of Object.values(v.tf as TransformState)) t.on = false;
    expect(validate("mutate", v, midi).tf).toMatch(/at least one transform/);
  });
});

describe("file names", () => {
  it("accepts .mid and .midi in any case", () => {
    expect(["a.mid", "b.MIDI", "c.Mid"].every(isMidiName)).toBe(true);
    expect(isMidiName("d.wav")).toBe(false);
  });

  it("tells audio apart from other files", () => {
    expect(badFileMessage("take.flac")).toMatch(/is audio/);
    expect(badFileMessage("notes.txt")).toBe("“notes.txt” isn't a MIDI file. Drop a .mid or .midi file.");
  });
});
