#!/usr/bin/env python3
"""
Buried Landscapes — MIDI Analyzer

Analyzes MIDI files and reports:
  - BPM, duration, bar count
  - Note count, average duration, velocity stats
  - Best-fit key + scale detection
  - Note distribution (with --verbose)

Install: pip3 install mido

Usage:
  python3 midi/analyze_midi.py path/to/file.mid
  python3 midi/analyze_midi.py *.mid               # multiple files
  python3 midi/analyze_midi.py file.mid --verbose  # show note distribution
"""

import argparse
import collections
import sys
from pathlib import Path

try:
    import mido
except ImportError:
    print("Error: mido not installed. Run: pip3 install mido")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Music theory helpers
# ---------------------------------------------------------------------------

NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]

SCALES = {
    "minor":      [0, 2, 3, 5, 7, 8, 10],
    "dorian":     [0, 2, 3, 5, 7, 9, 10],
    "phrygian":   [0, 1, 3, 5, 7, 8, 10],
    "lydian":     [0, 2, 4, 6, 7, 9, 11],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "major":      [0, 2, 4, 5, 7, 9, 11],
    "pentatonic": [0, 3, 5, 7, 10],
}


def note_name(midi_note: int) -> str:
    octave = midi_note // 12 - 1
    pc = NOTE_NAMES[midi_note % 12]
    return f"{pc}{octave}"


def detect_key_scale(note_counts: dict) -> tuple:
    """
    Brute-force key + scale detection.
    Scores each (root, scale) combination by the fraction of played notes
    that belong to the scale. Returns (key_name, scale_name, score 0–1).
    """
    total = sum(note_counts.values())
    if total == 0:
        return "?", "?", 0.0

    # Collapse to pitch classes
    pc_counts: dict = collections.Counter()
    for note, count in note_counts.items():
        pc_counts[note % 12] += count

    best_key, best_scale, best_score = "?", "?", -1.0
    for scale_name, intervals in SCALES.items():
        scale_set = set(intervals)
        for root in range(12):
            in_scale = sum(pc_counts[(root + iv) % 12] for iv in scale_set)
            score = in_scale / total
            if score > best_score:
                best_score = score
                best_key = NOTE_NAMES[root]
                best_scale = scale_name

    return best_key, best_scale, best_score


# ---------------------------------------------------------------------------
# Analyzer
# ---------------------------------------------------------------------------

def analyze(filepath: str, verbose: bool = False) -> None:
    try:
        mid = mido.MidiFile(filepath)
    except Exception as e:
        print(f"  Error reading {filepath}: {e}")
        return

    tpb = mid.ticks_per_beat
    tempos: list = []
    note_counts: dict = collections.Counter()
    velocities: list = []
    active: dict = {}       # note → abs_tick of note_on
    note_durations: list = []
    abs_tick = 0

    for msg in mido.merge_tracks(mid.tracks):
        abs_tick += msg.time
        if msg.type == "set_tempo":
            tempos.append(msg.tempo)
        elif msg.type == "note_on" and msg.velocity > 0:
            note_counts[msg.note] += 1
            velocities.append(msg.velocity)
            active[msg.note] = abs_tick
        elif msg.type in ("note_off", "note_on") and msg.velocity == 0:
            if msg.note in active:
                note_durations.append(abs_tick - active.pop(msg.note))

    avg_tempo = sum(tempos) / len(tempos) if tempos else 500_000
    bpm = 60_000_000 / avg_tempo
    total_beats = abs_tick / tpb
    total_bars = total_beats / 4
    duration_sec = mido.tick2second(abs_tick, tpb, int(avg_tempo))
    total_notes = sum(note_counts.values())
    avg_vel = sum(velocities) / len(velocities) if velocities else 0
    avg_dur_beats = (sum(note_durations) / len(note_durations) / tpb) if note_durations else 0

    key, scale, confidence = detect_key_scale(note_counts)

    # --- Print report ---
    w = 50
    print(f"\n{'─' * w}")
    print(f"  {Path(filepath).name}")
    print(f"{'─' * w}")
    print(f"  BPM        {bpm:.1f}"
          + (f"  ({len(tempos)} tempo changes)" if len(tempos) > 1 else ""))
    print(f"  Duration   {duration_sec:.1f}s  /  {total_bars:.1f} bars")
    print(f"  Notes      {total_notes}  (avg {avg_dur_beats:.2f} beats long)")
    if velocities:
        print(f"  Velocity   avg {avg_vel:.0f}  "
              f"min {min(velocities)}  max {max(velocities)}")
    print(f"  Best fit   {key} {scale}  ({confidence * 100:.0f}% in-scale)")

    if verbose and note_counts:
        print()
        print("  Note distribution:")
        max_count = max(note_counts.values())
        bar_width = 24
        for note, count in sorted(note_counts.items(), key=lambda x: -x[1]):
            filled = round(count / max_count * bar_width)
            bar = "█" * filled + "░" * (bar_width - filled)
            print(f"    {note_name(note):5s}  {bar}  {count}")

    print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Buried Landscapes — MIDI file analyzer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n"
               "  python3 midi/analyze_midi.py slow_chords.mid\n"
               "  python3 midi/analyze_midi.py *.mid --verbose\n",
    )
    parser.add_argument("files", nargs="+", help="MIDI file(s) to analyze")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Show full note distribution")
    args = parser.parse_args()

    for f in args.files:
        p = Path(f).expanduser()
        if not p.exists():
            print(f"Error: file not found: {f}")
            continue
        analyze(str(p), verbose=args.verbose)
