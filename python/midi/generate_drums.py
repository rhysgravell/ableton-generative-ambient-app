#!/usr/bin/env python3
"""
Buried Landscapes — Generative Drum MIDI

Generates drum MIDI clips on a General MIDI drum channel (10), with
configurable BPM and pattern type.

Install: pip3 install mido

Usage:
  python3 midi/generate_drums.py                      # 80bpm, 8 bars, both patterns
  python3 midi/generate_drums.py --bpm 120
  python3 midi/generate_drums.py --patterns sparse
  python3 midi/generate_drums.py --bars 4 --seed 7
  python3 midi/generate_drums.py --output ~/Desktop

Patterns:
  sparse         — minimal kick + rim/snare, scattered soft hats, lots of space
  four_on_floor  — steady kick on every quarter, 8th-note hat groove, backbeat snare

Outputs to ~/MIDI/Buried_Landscapes/Claude_MIDI/ by default.
Pipe the result through midi/mutate_midi.py --humanize for a looser feel.
"""

import os
import random
import argparse
from mido import MidiFile, MidiTrack, Message, MetaMessage


# ---------------------------------------------------------------------------
# General MIDI drum map (channel 10 / index 9)
# ---------------------------------------------------------------------------

DRUM_CHANNEL = 9
KICK = 36
RIMSHOT = 37
SNARE = 38
CLOSED_HAT = 42
OPEN_HAT = 46

STEPS_PER_BAR = 16   # 16th-note grid


# ---------------------------------------------------------------------------
# Core MIDI helpers
# ---------------------------------------------------------------------------

def events_to_track(events: list, tempo: int) -> MidiTrack:
    """(abs_tick, 'on'|'off', note, velocity) list → MidiTrack on DRUM_CHANNEL."""
    events = sorted(events, key=lambda e: (e[0], e[1]))
    track = MidiTrack()
    track.append(MetaMessage("set_tempo", tempo=tempo, time=0))
    prev_t = 0
    for abs_t, etype, note, velocity in events:
        delta = abs_t - prev_t
        msg_type = "note_on" if etype == "on" else "note_off"
        track.append(Message(msg_type, note=note, velocity=velocity, time=delta, channel=DRUM_CHANNEL))
        prev_t = abs_t
    return track


def save_mid(events: list, tempo: int, tpb: int, path: str) -> None:
    mid = MidiFile(ticks_per_beat=tpb)
    mid.tracks.append(events_to_track(events, tempo))
    mid.save(path)


def add_hit(events: list, t: int, note: int, vel: int, dur: int) -> None:
    events.append((t, "on", note, vel))
    events.append((t + dur, "off", note, 0))


# ---------------------------------------------------------------------------
# Pattern generators
# ---------------------------------------------------------------------------

def make_sparse(bars, bar_ticks, step_ticks, tpb, tempo, out_dir, bpm) -> str:
    """Minimal kick + rim/snare, scattered soft hats, lots of space."""
    events = []
    hit_dur = max(10, int(step_ticks * 0.4))

    for bar in range(bars):
        base = bar * bar_ticks

        add_hit(events, base, KICK, random.randint(85, 105), hit_dur)
        if random.random() < 0.25:
            step = random.choice([6, 7, 10, 11])
            add_hit(events, base + step * step_ticks, KICK, random.randint(55, 75), hit_dur)

        if random.random() < 0.85:
            note = SNARE if random.random() < 0.7 else RIMSHOT
            add_hit(events, base + 8 * step_ticks, note, random.randint(70, 95), hit_dur)

        num_hats = random.randint(2, 4)
        for step in random.sample(range(STEPS_PER_BAR), k=num_hats):
            add_hit(events, base + step * step_ticks, CLOSED_HAT, random.randint(30, 50), hit_dur)

        if random.random() < 0.15:
            step = random.choice([14, 15])
            add_hit(events, base + step * step_ticks, OPEN_HAT, random.randint(45, 65), hit_dur)

    path = os.path.join(out_dir, f"sparse_drums_{bpm}bpm.mid")
    save_mid(events, tempo, tpb, path)
    return path


def make_four_on_floor(bars, bar_ticks, step_ticks, tpb, tempo, out_dir, bpm) -> str:
    """Steady kick on every quarter, 8th-note hat groove, backbeat snare."""
    events = []
    hit_dur = max(10, int(step_ticks * 0.4))

    for bar in range(bars):
        base = bar * bar_ticks

        for step in (0, 4, 8, 12):
            add_hit(events, base + step * step_ticks, KICK, random.randint(100, 115), hit_dur)

        for step in (4, 12):
            add_hit(events, base + step * step_ticks, SNARE, random.randint(90, 105), hit_dur)

        for step in range(0, STEPS_PER_BAR, 2):
            on_beat = step % 4 == 0
            vel = random.randint(80, 95) if on_beat else random.randint(50, 65)
            add_hit(events, base + step * step_ticks, CLOSED_HAT, vel, hit_dur)

        if bar % 2 == 1:
            add_hit(events, base + 14 * step_ticks, OPEN_HAT, random.randint(55, 70), hit_dur)

    path = os.path.join(out_dir, f"four_on_floor_drums_{bpm}bpm.mid")
    save_mid(events, tempo, tpb, path)
    return path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Buried Landscapes — Generative Drum MIDI generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n"
               "  python3 midi/generate_drums.py\n"
               "  python3 midi/generate_drums.py --bpm 120 --patterns four_on_floor\n"
               "  python3 midi/generate_drums.py --bars 4 --seed 7\n",
    )
    parser.add_argument("--bpm", type=int, default=80,
                        help="Tempo in BPM (default: 80)")
    parser.add_argument("--bars", type=int, default=8,
                        help="Clip length in bars (default: 8)")
    parser.add_argument("--patterns", nargs="+",
                        choices=["sparse", "four_on_floor"],
                        default=["sparse", "four_on_floor"],
                        help="Patterns to generate (default: both)")
    parser.add_argument("--seed", type=int, default=None,
                        help="Random seed for reproducible output")
    parser.add_argument("--output", default=None,
                        help="Output directory (default: ~/MIDI/Buried_Landscapes/Claude_MIDI)")

    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    TPB = 480
    tempo = int(60_000_000 / args.bpm)
    bar_ticks = TPB * 4
    step_ticks = bar_ticks // STEPS_PER_BAR

    out_dir = args.output or os.path.expanduser("~/MIDI/Buried_Landscapes/Claude_MIDI")
    os.makedirs(out_dir, exist_ok=True)

    print(f"Buried Landscapes — drums, {args.bpm}bpm, {args.bars} bars\n")

    requested = args.patterns
    if "sparse" in requested:
        path = make_sparse(args.bars, bar_ticks, step_ticks, TPB, tempo, out_dir, args.bpm)
        print(f"  {os.path.basename(path)}  →  {path}")
    if "four_on_floor" in requested:
        path = make_four_on_floor(args.bars, bar_ticks, step_ticks, TPB, tempo, out_dir, args.bpm)
        print(f"  {os.path.basename(path)}  →  {path}")

    print(f"\nDrop into Ableton on a drum rack / channel-10 instrument track. Set project to {args.bpm}bpm.")
