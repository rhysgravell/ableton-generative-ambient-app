import { describe, expect, it } from "vitest";
import { chordName, fileTag, keyIndex, parseProg, prettyNote, scriptKey, type ProgItem, type Scale } from "./theory";

/** Chord names for a progression, failing the test if any numeral doesn't parse. */
function chords(spec: string, key: string, scale: Scale) {
  const { items, error } = parseProg(spec, scale);
  expect(error).toBeNull();
  return items.map((i) => chordName(i as Extract<ProgItem, { ok: true }>, keyIndex(key), scale));
}

describe("parseProg", () => {
  it("parses the generator's numerals into degrees", () => {
    const { items, error } = parseProg("i-VI-III-VII", "minor");
    expect(error).toBeNull();
    expect(items.map((i) => i.ok && i.deg)).toEqual([0, 5, 2, 6]);
  });

  it("ignores case, since the scale sets each chord's quality", () => {
    expect(chords("I-vi-iii-vii", "A", "minor")).toEqual(chords("i-VI-III-VII", "A", "minor"));
  });

  it("splits on spaces, commas and dashes", () => {
    expect(parseProg(" i,  iv – v—i ", "minor").toks).toEqual(["i", "iv", "v", "i"]);
  });

  it("reads a trailing 7 as a seventh chord", () => {
    expect(parseProg("i7-iv", "minor").items.map((i) => i.ok && i.seventh)).toEqual([true, false]);
  });

  it("asks for a numeral when empty", () => {
    expect(parseProg("  ", "minor").error).toMatch(/at least one numeral/);
  });

  it("rejects anything that isn't a numeral", () => {
    const { items, error } = parseProg("i-x-v", "minor");
    expect(items[1].ok).toBe(false);
    expect(error).toMatch(/“x” isn't a scale degree/);
  });

  it("rejects degrees past the end of a pentatonic scale", () => {
    expect(parseProg("i-v", "pentatonic").error).toBeNull();
    expect(parseProg("i-VI", "pentatonic").error).toBe("“VI” is degree 6, but pentatonic only has 5 notes. Use I–V.");
  });
});

describe("chordName", () => {
  it("builds diatonic triads in a minor key", () => {
    expect(chords("i-ii-III-iv-v-VI-VII", "A", "minor")).toEqual(["Am", "B°", "C", "Dm", "Em", "F", "G"]);
  });

  it("builds diatonic sevenths", () => {
    expect(chords("i7-ii7-III7-v7", "A", "minor")).toEqual(["Am7", "Bø7", "Cmaj7", "Em7"]);
    expect(chords("I7-V7", "C", "major")).toEqual(["Cmaj7", "G7"]);
  });

  it("follows the mode", () => {
    expect(chords("i-IV", "D", "dorian")).toEqual(["Dm", "G"]);
    expect(chords("I-II", "F", "lydian")).toEqual(["F", "G"]);
  });

  it("spells with flats in flat keys", () => {
    expect(chords("i-VI-VII", "D", "minor")).toEqual(["Dm", "B♭", "C"]);
    expect(chords("i-III", "C", "minor")).toEqual(["Cm", "E♭"]);
  });

  it("spells with sharps in sharp keys", () => {
    expect(chords("i-v", "F♯", "minor")).toEqual(["F♯m", "C♯m"]);
  });
});

describe("name helpers", () => {
  it("converts keys for the scripts' --key flag", () => {
    expect(scriptKey("C♯")).toBe("C#");
    expect(scriptKey("E♭")).toBe("Eb");
  });

  it("makes file-safe key tags", () => {
    expect(fileTag("C♯")).toBe("Cs");
    expect(fileTag("C#")).toBe("Cs");
    expect(fileTag("B♭")).toBe("Bb");
  });

  it("turns script note names into display names", () => {
    expect(prettyNote("C#")).toBe("C♯");
    expect(prettyNote("Eb")).toBe("E♭");
    expect(prettyNote("B")).toBe("B");
  });
});
