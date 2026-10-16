#!/usr/bin/env python3
"""
Buried Landscapes — Scale Explorer

Prints scale notes (with MIDI numbers), diatonic chords, and related modes
for any key + scale combination. Useful quick-reference when setting up a
session or dialling in the Spectral Resonator's base frequency.

No dependencies — pure stdlib.

Usage:
  python3 tools/scale_explorer.py              # G minor (default)
  python3 tools/scale_explorer.py D dorian
  python3 tools/scale_explorer.py Bb major
  python3 tools/scale_explorer.py A pentatonic
  python3 tools/scale_explorer.py --list       # list all available scales
"""

import argparse
import sys


# ---------------------------------------------------------------------------
# Music theory data
# ---------------------------------------------------------------------------

NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]

# Frequency of C0 = 16.352 Hz; MIDI note 0 = C-1 in Ableton convention
# MIDI 60 = C4 (middle C), MIDI 69 = A4 = 440 Hz
A4_MIDI = 69
A4_HZ   = 440.0


def midi_to_hz(note: int) -> float:
    return A4_HZ * 2 ** ((note - A4_MIDI) / 12)


SCALES: dict = {
    "minor":      {"intervals": [0, 2, 3, 5, 7, 8, 10], "alias": "natural minor / aeolian"},
    "dorian":     {"intervals": [0, 2, 3, 5, 7, 9, 10],  "alias": "dorian mode"},
    "phrygian":   {"intervals": [0, 1, 3, 5, 7, 8, 10],  "alias": "phrygian mode"},
    "lydian":     {"intervals": [0, 2, 4, 6, 7, 9, 11],  "alias": "lydian mode"},
    "mixolydian": {"intervals": [0, 2, 4, 5, 7, 9, 10],  "alias": "mixolydian mode"},
    "major":      {"intervals": [0, 2, 4, 5, 7, 9, 11],  "alias": "major / ionian"},
    "pentatonic": {"intervals": [0, 3, 5, 7, 10],         "alias": "minor pentatonic"},
}

ROOT_NOTES: dict = {
    "C": 48, "C#": 49, "Db": 49, "D": 50, "D#": 51, "Eb": 51,
    "E": 52, "F": 53, "F#": 54, "Gb": 54, "G": 55, "G#": 56,
    "Ab": 56, "A": 57, "A#": 58, "Bb": 58, "B": 59,
}

# Chord quality names for each degree of each scale
# Index = scale degree (0-based). Only defined for 7-note scales.
CHORD_QUALITIES: dict = {
    "minor":      ["m", "dim", "Maj", "m",   "m",   "Maj", "Maj"],
    "dorian":     ["m", "m",   "Maj", "Maj", "m",   "dim", "Maj"],
    "phrygian":   ["m", "Maj", "Maj", "m",   "dim", "Maj", "m"  ],
    "lydian":     ["Maj","Maj","Maj", "dim", "Maj", "m",   "m"  ],
    "mixolydian": ["Maj","m",  "dim", "Maj", "m",   "m",   "Maj"],
    "major":      ["Maj","m",  "m",   "Maj", "Maj", "m",   "dim"],
    "pentatonic": ["m", "Maj", "m",   "m",   "Maj", None,  None ],
}

ROMAN_NUMERALS = ["i", "ii", "iii", "iv", "v", "vi", "vii"]

# Parallel mode relationships (each mode's "brightness" rank)
MODE_ORDER = ["phrygian", "minor", "dorian", "mixolydian", "major", "lydian"]


def pc_name(pc: int) -> str:
    """Pitch class (0–11) → note name."""
    return NOTE_NAMES[pc % 12]


def note_label(midi: int) -> str:
    """MIDI note → 'G3' style label."""
    octave = midi // 12 - 1
    return f"{NOTE_NAMES[midi % 12]}{octave}"


def build_scale_notes(root: int, intervals: list) -> list:
    return [root + iv for iv in intervals]


def build_chords(root: int, intervals: list) -> list:
    """Returns triads as lists of MIDI notes using extended 2-octave scale."""
    n = len(intervals)
    ext = [root + intervals[i % n] + (i // n) * 12 for i in range(n * 2)]
    chords = []
    for deg in range(n):
        triad = [ext[deg], ext[deg + 2], ext[deg + 4]]
        chords.append(triad)
    return chords


# ---------------------------------------------------------------------------
# Display
# ---------------------------------------------------------------------------

def print_header(key: str, scale_name: str, scale_info: dict) -> None:
    title = f"{key} {scale_name}  ({scale_info['alias']})"
    bar = "─" * (len(title) + 4)
    print()
    print(f"  {bar}")
    print(f"  {title}")
    print(f"  {bar}")


def print_scale_notes(scale_notes: list) -> None:
    print()
    print("  Scale notes:")
    labels = "  ".join(f"{note_label(n):5s}" for n in scale_notes)
    midis  = "  ".join(f"{n:5d}" for n in scale_notes)
    hz_str = "  ".join(f"{midi_to_hz(n):5.1f}" for n in scale_notes)
    print(f"    Notes   {labels}")
    print(f"    MIDI    {midis}")
    print(f"    Hz      {hz_str}")
    # Spectral Resonator hint: root frequency
    root_hz = midi_to_hz(scale_notes[0])
    print(f"\n    Spectral Resonator root → {root_hz:.1f} Hz  ({note_label(scale_notes[0])})")


def print_chords(key: str, scale_name: str, root: int, intervals: list) -> None:
    chords    = build_chords(root, intervals)
    qualities = CHORD_QUALITIES.get(scale_name, ["?"] * len(intervals))
    n         = len(intervals)

    print()
    print("  Diatonic chords:")
    print(f"    {'Degree':<8} {'Name':<10} {'Notes'}")
    print(f"    {'─'*6}   {'─'*8}   {'─'*24}")

    for deg in range(min(n, 7)):
        q   = qualities[deg] if deg < len(qualities) else "?"
        if q is None:
            continue
        rn  = ROMAN_NUMERALS[deg]
        rn  = rn.upper() if q in ("Maj",) else rn
        rn  = rn + "°" if q == "dim" else rn

        root_name = pc_name(chords[deg][0])
        chord_name = f"{root_name}{'' if q == 'Maj' else q if q != 'dim' else '°'}"
        notes_str  = "  ".join(note_label(n) for n in chords[deg])
        print(f"    {rn:<8} {chord_name:<10} {notes_str}")


def print_modes(key: str, scale_name: str) -> None:
    if scale_name not in MODE_ORDER:
        return

    pos = MODE_ORDER.index(scale_name)
    print()
    print("  Parallel modes  (same root, different brightness):")

    for i, mode in enumerate(MODE_ORDER):
        diff = i - pos
        if diff == 0:
            marker = "← you are here"
        elif diff > 0:
            marker = f"{'♯' * diff} brighter"
        else:
            marker = f"{'♭' * abs(diff)} darker"
        this = "→ " if diff == 0 else "  "
        print(f"    {this}{key} {mode:<14}  {marker}")

    # Relative major/minor shortcut
    if scale_name == "minor":
        rel_root_pc = (ROOT_NOTES[key] + 3) % 12
        rel_name = pc_name(rel_root_pc)
        print(f"\n  Relative major → {rel_name} major  (same notes, brighter feel)")
    elif scale_name == "major":
        rel_root_pc = (ROOT_NOTES[key] - 3) % 12
        rel_name = pc_name(rel_root_pc)
        print(f"\n  Relative minor → {rel_name} minor  (same notes, darker feel)")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Buried Landscapes — Scale Explorer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n"
               "  python3 tools/scale_explorer.py\n"
               "  python3 tools/scale_explorer.py D dorian\n"
               "  python3 tools/scale_explorer.py Bb major\n"
               "  python3 tools/scale_explorer.py --list\n",
    )
    parser.add_argument("key",   nargs="?", default="G",
                        help="Root note (default: G)")
    parser.add_argument("scale", nargs="?", default="minor",
                        help="Scale name (default: minor)")
    parser.add_argument("--list", action="store_true",
                        help="List all available scales and exit")
    args = parser.parse_args()

    if args.list:
        print("\n  Available scales:")
        for name, info in SCALES.items():
            ivs = " ".join(str(i) for i in info["intervals"])
            print(f"    {name:<14}  {info['alias']:<30}  [{ivs}]")
        print()
        sys.exit(0)

    key   = args.key
    scale = args.scale.lower()

    if key not in ROOT_NOTES:
        print(f"Error: unknown key '{key}'. Valid keys: {', '.join(sorted(ROOT_NOTES))}")
        sys.exit(1)
    if scale not in SCALES:
        print(f"Error: unknown scale '{scale}'. Use --list to see options.")
        sys.exit(1)

    root       = ROOT_NOTES[key]
    scale_info = SCALES[scale]
    intervals  = scale_info["intervals"]
    scale_notes = build_scale_notes(root, intervals)

    print_header(key, scale, scale_info)
    print_scale_notes(scale_notes)
    print_chords(key, scale, root, intervals)
    print_modes(key, scale)
    print()
