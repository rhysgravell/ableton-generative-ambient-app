#!/usr/bin/env python3
"""
Buried Landscapes — BPM Sync Calculator

Given a BPM, prints sync times for every common note division:
  - Milliseconds (for delay units, envelope times, etc.)
  - Hz (for LFO rate knobs that accept frequency)

No dependencies — pure stdlib.

Usage:
  python3 tools/bpm_sync.py            # defaults to 80 BPM
  python3 tools/bpm_sync.py 72
  python3 tools/bpm_sync.py 120 --no-hz
"""

import argparse
import sys

# (label, beat_multiplier, musical description)
DIVISIONS = [
    ("4 bars",         16.0,  "very slow sweep / breath"),
    ("2 bars",          8.0,  "slow modulation"),
    ("1 bar",           4.0,  "per-bar cycling"),
    ("Dotted half",     3.0,  "3 beats"),
    ("Half",            2.0,  "half note"),
    ("Dotted quarter",  1.5,  "dotted quarter"),
    ("Quarter",         1.0,  "quarter note / 1 beat"),
    ("Dotted 8th",      0.75, "classic slapback delay"),
    ("8th",             0.5,  "eighth note"),
    ("Dotted 16th",     0.375,"dotted 16th"),
    ("16th",            0.25, "16th note"),
    ("32nd",            0.125,"32nd note / fast gate"),
]

# LFO Hz presets mentioned in project docs
NAMED_LFOS = [
    ("Blur drift (project default)", 0.1),
    ("Slow modulation",              0.2),
    ("Medium movement",              0.5),
    ("Fast shimmer",                 2.0),
    ("Tremolo",                      6.0),
]


def print_sync_table(bpm: float, show_hz: bool) -> None:
    ms_per_beat = 60_000.0 / bpm

    w = 52 if show_hz else 38
    print()
    print(f"  BPM: {bpm:.1f}   (beat = {ms_per_beat:.1f} ms)")
    print(f"  {'─' * w}")

    if show_hz:
        print(f"  {'Division':<18}  {'ms':>8}  {'Hz':>8}   Notes")
        print(f"  {'─' * w}")
        for label, mult, note in DIVISIONS:
            ms = ms_per_beat * mult
            hz = 1000.0 / ms
            print(f"  {label:<18}  {ms:>8.1f}  {hz:>8.4f}   {note}")
    else:
        print(f"  {'Division':<18}  {'ms':>8}   Notes")
        print(f"  {'─' * w}")
        for label, mult, note in DIVISIONS:
            ms = ms_per_beat * mult
            print(f"  {label:<18}  {ms:>8.1f}   {note}")

    # Named LFO reference
    print()
    print(f"  LFO reference  (Hz → nearest musical division at {bpm:.0f} bpm)")
    print(f"  {'─' * w}")
    for name, hz in NAMED_LFOS:
        ms = 1000.0 / hz
        beats = ms / ms_per_beat
        # Find nearest named division
        nearest = min(DIVISIONS, key=lambda d: abs(d[1] - beats))
        print(f"  {hz:.2f} Hz  =  {ms:>7.1f} ms  ≈  {nearest[0]}    [{name}]")

    print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Buried Landscapes — BPM sync time calculator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n"
               "  python3 tools/bpm_sync.py\n"
               "  python3 tools/bpm_sync.py 90\n"
               "  python3 tools/bpm_sync.py 72 --no-hz\n",
    )
    parser.add_argument("bpm", nargs="?", type=float, default=80.0,
                        help="BPM to calculate for (default: 80)")
    parser.add_argument("--no-hz", dest="show_hz", action="store_false", default=True,
                        help="Hide LFO Hz column")
    args = parser.parse_args()

    if args.bpm <= 0:
        print("Error: BPM must be positive")
        sys.exit(1)

    print_sync_table(args.bpm, args.show_hz)
