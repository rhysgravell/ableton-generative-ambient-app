#!/usr/bin/env python3
"""
Buried Landscapes — MIDI Mutator

Transforms a MIDI file with one or more operations and writes a new file.
Stack multiple transforms in a single pass.

Install: pip3 install mido

Transforms:
  --transpose N           Shift all notes by N semitones (positive or negative)
  --humanize [AMOUNT]     Add subtle timing + velocity randomness (0.0–1.0, default 0.35)
  --reverse               Flip note order in time (first note becomes last)
  --stretch FACTOR        Time-stretch notes (2.0 = twice as slow, 0.5 = twice as fast)
  --velocity-scale FACTOR Multiply all velocities (e.g. 0.7 to dim, 1.3 to boost)
  --output PATH           Output path (default: <input>_mutated.mid)

Usage:
  python3 midi/mutate_midi.py slow_chords.mid --transpose -2
  python3 midi/mutate_midi.py generative.mid --humanize 0.5
  python3 midi/mutate_midi.py slow_chords.mid --reverse
  python3 midi/mutate_midi.py generative.mid --stretch 1.5 --humanize
  python3 midi/mutate_midi.py arp.mid --transpose 5 --velocity-scale 0.8 --output dark_arp.mid
"""

import argparse
import random
import sys
from pathlib import Path

try:
    from mido import MidiFile, MidiTrack, Message, MetaMessage
except ImportError:
    print("Error: mido not installed. Run: pip3 install mido")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Load / save helpers
# ---------------------------------------------------------------------------

def load_events(mid: MidiFile) -> tuple:
    """
    Returns (tempo, tpb, events) where events is a list of [abs_tick, msg].
    Works with Type 0 single-track files (all generated MIDI is Type 0).
    """
    tpb = mid.ticks_per_beat
    tempo = 500_000  # default 120 BPM

    events = []
    abs_t = 0
    track = next((t for t in mid.tracks if len(t) > 1), mid.tracks[0])
    for msg in track:
        abs_t += msg.time
        if msg.type == "set_tempo":
            tempo = msg.tempo
        events.append([abs_t, msg])

    return tempo, tpb, events


def events_to_mid(events: list, tempo: int, tpb: int) -> MidiFile:
    """Write events list back to a Type 0 MidiFile."""
    # Sort: note_offs sort before note_ons at the same tick to avoid stuck notes
    def sort_key(e):
        _, msg = e
        if msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
            return (e[0], 0)
        return (e[0], 1)

    sorted_events = sorted(events, key=sort_key)

    track = MidiTrack()
    # Ensure tempo is set at t=0
    if not any(msg.type == "set_tempo" for _, msg in sorted_events[:3]):
        track.append(MetaMessage("set_tempo", tempo=tempo, time=0))

    prev_t = 0
    for abs_t, msg in sorted_events:
        delta = max(0, abs_t - prev_t)
        track.append(msg.copy(time=delta))
        prev_t = abs_t

    mid = MidiFile(ticks_per_beat=tpb)
    mid.tracks.append(track)
    return mid


# ---------------------------------------------------------------------------
# Transforms
# ---------------------------------------------------------------------------

def do_transpose(events: list, semitones: int) -> list:
    result = []
    for abs_t, msg in events:
        if msg.type in ("note_on", "note_off") and hasattr(msg, "note"):
            new_note = max(0, min(127, msg.note + semitones))
            result.append([abs_t, msg.copy(note=new_note)])
        else:
            result.append([abs_t, msg])
    return result


def do_humanize(events: list, amount: float, tpb: int) -> list:
    """
    Adds subtle per-note timing and velocity variation.
    Timing jitter is applied identically to note_on and its paired note_off
    so note lengths stay the same — only the start positions shift.
    """
    max_jitter = int(tpb * 0.10 * amount)   # up to 10% of a beat
    vel_range  = int(14 * amount)

    # First pass: assign a jitter value to each note_on event index,
    # then map the paired note_off to the same jitter.
    jitter_map: dict = {}   # event index → tick jitter
    active: dict = {}       # note → (on_event_index, jitter)

    for i, (abs_t, msg) in enumerate(events):
        if msg.type == "note_on" and msg.velocity > 0:
            j = random.randint(-max_jitter, max_jitter)
            jitter_map[i] = j
            active[msg.note] = (i, j)
        elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
            if msg.note in active:
                _, j = active.pop(msg.note)
                jitter_map[i] = j   # same jitter as the paired on

    result = []
    for i, (abs_t, msg) in enumerate(events):
        j = jitter_map.get(i, 0)
        new_t = max(0, abs_t + j)
        if msg.type == "note_on" and msg.velocity > 0 and vel_range > 0:
            new_vel = max(1, min(127, msg.velocity + random.randint(-vel_range, vel_range)))
            result.append([new_t, msg.copy(velocity=new_vel)])
        else:
            result.append([new_t, msg])

    return result


def do_reverse(events: list) -> list:
    """
    Reverses all note events in time. Non-note messages (tempo, etc.) stay at t=0.
    """
    note_events = [(abs_t, msg) for abs_t, msg in events
                   if msg.type in ("note_on", "note_off")]
    other_events = [[abs_t, msg] for abs_t, msg in events
                    if msg.type not in ("note_on", "note_off")]

    if not note_events:
        return events

    total = max(abs_t for abs_t, _ in note_events)

    # Rebuild note pairs, then mirror them
    active: dict = {}   # note → (start_tick, velocity)
    pairs: list = []    # (start, end, note, vel)
    for abs_t, msg in sorted(note_events, key=lambda x: x[0]):
        if msg.type == "note_on" and msg.velocity > 0:
            active[msg.note] = (abs_t, msg.velocity)
        elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
            if msg.note in active:
                start, vel = active.pop(msg.note)
                pairs.append((start, abs_t, msg.note, vel))

    if active:
        print(f"  Warning: {len(active)} note(s) with no matching note_off "
              f"were dropped during reverse")

    result = list(other_events)
    for start, end, note, vel in pairs:
        new_start = total - end
        new_end   = total - start
        result.append([max(0, new_start), Message("note_on",  note=note, velocity=vel, time=0)])
        result.append([max(0, new_end),   Message("note_off", note=note, velocity=0,   time=0)])

    return result


def do_stretch(events: list, factor: float) -> list:
    """
    Time-stretches note positions by factor. Tempo is unchanged so Ableton
    reads the same BPM but the clip is proportionally longer/shorter.
    """
    result = []
    for abs_t, msg in events:
        if msg.type == "set_tempo":
            result.append([abs_t, msg])   # keep tempo at its original position
        else:
            result.append([int(abs_t * factor), msg])
    return result


def do_velocity_scale(events: list, factor: float) -> list:
    result = []
    for abs_t, msg in events:
        if msg.type == "note_on" and msg.velocity > 0:
            new_vel = max(1, min(127, int(msg.velocity * factor)))
            result.append([abs_t, msg.copy(velocity=new_vel)])
        else:
            result.append([abs_t, msg])
    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Buried Landscapes — MIDI transformer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Examples:\n"
               "  python3 midi/mutate_midi.py slow_chords.mid --transpose -2\n"
               "  python3 midi/mutate_midi.py generative.mid --humanize 0.5\n"
               "  python3 midi/mutate_midi.py generative.mid --stretch 1.5 --humanize\n"
               "  python3 midi/mutate_midi.py slow_chords.mid --reverse --transpose 5\n",
    )
    parser.add_argument("input", help="Input MIDI file")
    parser.add_argument("--transpose", type=int, metavar="N",
                        help="Shift all notes by N semitones")
    parser.add_argument("--humanize", type=float, nargs="?", const=0.35, metavar="AMOUNT",
                        help="Timing + velocity randomness 0.0–1.0 (default 0.35 if flag given)")
    parser.add_argument("--reverse", action="store_true",
                        help="Reverse note order in time")
    parser.add_argument("--stretch", type=float, metavar="FACTOR",
                        help="Time-stretch (2.0 = twice as slow)")
    parser.add_argument("--velocity-scale", type=float, metavar="FACTOR",
                        help="Multiply all velocities (e.g. 0.8 to dim)")
    parser.add_argument("--seed", type=int, default=None,
                        help="Random seed (for reproducible humanize)")
    parser.add_argument("--output", default=None,
                        help="Output file path (default: <input>_mutated.mid)")
    args = parser.parse_args()

    # Validate: at least one transform requested
    transforms = [args.transpose, args.humanize, args.reverse,
                  args.stretch, args.velocity_scale]
    if not any(t is not None and t is not False for t in transforms):
        parser.error("Specify at least one transform: --transpose, --humanize, "
                     "--reverse, --stretch, --velocity-scale")

    inp = Path(args.input).expanduser()
    if not inp.exists():
        print(f"Error: file not found: {inp}")
        sys.exit(1)

    if args.seed is not None:
        random.seed(args.seed)

    mid = MidiFile(str(inp))
    tempo, tpb, events = load_events(mid)

    applied = []

    if args.reverse:
        events = do_reverse(events)
        applied.append("reverse")

    if args.stretch is not None:
        events = do_stretch(events, args.stretch)
        applied.append(f"stretch ×{args.stretch}")

    if args.transpose is not None:
        events = do_transpose(events, args.transpose)
        applied.append(f"transpose {args.transpose:+d}")

    if args.velocity_scale is not None:
        events = do_velocity_scale(events, args.velocity_scale)
        applied.append(f"velocity ×{args.velocity_scale}")

    if args.humanize is not None:
        events = do_humanize(events, args.humanize, tpb)
        applied.append(f"humanize {args.humanize:.2f}")

    out_path = args.output or str(inp.with_stem(inp.stem + "_mutated"))
    out_mid = events_to_mid(events, tempo, tpb)
    out_mid.save(out_path)

    print(f"  {inp.name}  →  {out_path}")
    print(f"  transforms: {',  '.join(applied)}")
