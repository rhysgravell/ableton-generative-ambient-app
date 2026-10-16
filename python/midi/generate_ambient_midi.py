#!/usr/bin/env python3
"""
Buried Landscapes — Generative MIDI

Generates ambient MIDI clips with configurable key, scale, BPM, and pattern types.
Chords, arp and bass all follow one shared chord progression, so the clips layer
together in tune.

Install: pip3 install mido

Usage:
  python3 midi/generate_ambient_midi.py                            # G minor, 80bpm, 16 bars, all 4 patterns
  python3 midi/generate_ambient_midi.py --key D --scale dorian
  python3 midi/generate_ambient_midi.py --bpm 60 --bars 32
  python3 midi/generate_ambient_midi.py --patterns chords melodic  # only these two
  python3 midi/generate_ambient_midi.py --progression i-VI-III-VII # explicit progression
  python3 midi/generate_ambient_midi.py --progression lament       # named progression
  python3 midi/generate_ambient_midi.py --chord-bars 4             # slower harmonic rhythm
  python3 midi/generate_ambient_midi.py --seed 42                  # reproducible output
  python3 midi/generate_ambient_midi.py --output ~/Desktop

Patterns:
  chords   — slow chord pads, one chord per progression step
  melodic  — stepwise melody with rests, biased toward the current chord tones
  bass     — very slow root/fifth drone following the progression
  arp      — arpeggiated chord tones, chord changes with the progression

Outputs to ~/MIDI/Buried_Landscapes/Claude_MIDI/ by default.
"""

import os
import random
import argparse
from mido import MidiFile, MidiTrack, Message, MetaMessage


# ---------------------------------------------------------------------------
# Scale definitions — semitone intervals from root
# ---------------------------------------------------------------------------

SCALES = {
    "minor":      [0, 2, 3, 5, 7, 8, 10],   # natural minor / aeolian
    "dorian":     [0, 2, 3, 5, 7, 9, 10],
    "phrygian":   [0, 1, 3, 5, 7, 8, 10],
    "lydian":     [0, 2, 4, 6, 7, 9, 11],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "major":      [0, 2, 4, 5, 7, 9, 11],
    "pentatonic": [0, 3, 5, 7, 10],         # minor pentatonic
}

ROOT_NOTES = {
    "C": 48, "C#": 49, "Db": 49, "D": 50, "D#": 51, "Eb": 51,
    "E": 52, "F": 53, "F#": 54, "Gb": 54, "G": 55, "G#": 56,
    "Ab": 56, "A": 57, "A#": 58, "Bb": 58, "B": 59,
}

BASS_FLOOR = 36   # C2 — bottom of the octave the bass drone is folded into


# ---------------------------------------------------------------------------
# Chord progressions
#
# Progressions are written in roman numerals but resolved by scale degree, so
# the same spec works in any mode — the scale supplies the chord quality.
# Case is cosmetic; a trailing 7 asks for a seventh chord (e.g. i7-iv7).
# ---------------------------------------------------------------------------

ROMAN_DEGREES = {"i": 0, "ii": 1, "iii": 2, "iv": 3, "v": 4, "vi": 5, "vii": 6}

PROGRESSIONS = {
    "drift":     "i-VI",             # two-chord hover
    "lament":    "i-VI-III-VII",     # the classic minor loop
    "descent":   "i-VII-VI-v",       # stepwise fall
    "suspended": "i-iv-i-v",         # unresolved, circling
    "bloom":     "i-III-VII-iv",     # brightening then back
    "static":    "i",                # single chord drone
}

# Weight per scale degree for --progression random. Tonic, subdominant and
# submediant get the most pull; the leading-tone degree the least.
DEGREE_WEIGHTS = [4, 1, 3, 4, 3, 4, 2]


def parse_progression(spec: str, num_degrees: int) -> list:
    """
    'i-VI-III-VII7' → [(0, False), (5, False), (2, False), (6, True)]

    Returns (degree_index, is_seventh) pairs. Accepts '-', ',' or spaces as
    separators, and resolves named progressions from PROGRESSIONS.
    """
    spec = PROGRESSIONS.get(spec.strip().lower(), spec)
    tokens = [t for t in spec.replace(",", " ").replace("-", " ").split() if t]
    if not tokens:
        raise ValueError("empty progression")

    steps = []
    for token in tokens:
        seventh = token.endswith("7")
        numeral = token[:-1] if seventh else token
        degree = ROMAN_DEGREES.get(numeral.lower())
        if degree is None:
            raise ValueError(
                f"unknown chord '{token}' — use i–vii, optionally with a trailing 7"
            )
        if degree >= num_degrees:
            raise ValueError(
                f"'{token}' is degree {degree + 1}, but this scale only has "
                f"{num_degrees} degrees"
            )
        steps.append((degree, seventh))
    return steps


def random_progression(num_degrees: int, length: int = 4) -> list:
    """Weighted random walk over scale degrees, always starting on the tonic."""
    weights = DEGREE_WEIGHTS[:num_degrees] or [1] * num_degrees
    steps = [(0, False)]
    while len(steps) < length:
        degrees = list(range(num_degrees))
        # Avoid repeating the previous chord — ambient, but not stuck.
        choices = [d for d in degrees if d != steps[-1][0]]
        picks = random.choices(choices, weights=[weights[d] for d in choices])
        steps.append((picks[0], random.random() < 0.35))
    return steps


def format_progression(steps: list) -> str:
    """[(0, False), (5, True)] → 'i-VI7' (lowercase numerals, display only)."""
    numerals = ["i", "ii", "iii", "iv", "v", "vi", "vii"]
    return "-".join(numerals[d] + ("7" if s else "") for d, s in steps)


def build_scale(root: int, intervals: list, octaves: int = 3) -> list:
    """MIDI notes for a scale across multiple octaves."""
    notes = []
    for oct in range(octaves):
        for iv in intervals:
            n = root + oct * 12 + iv
            if 0 <= n <= 127:
                notes.append(n)
    return notes


def diatonic_chord(root: int, intervals: list, degree: int, seventh: bool = False) -> list:
    """
    Chord built by stacking every-other scale degree from `degree`.
    Uses a 2-octave extended scale so wrapping degrees stay in the upper octave.
    """
    n = len(intervals)
    ext = [root + intervals[i % n] + (i // n) * 12 for i in range(n * 3)]
    notes = [ext[degree], ext[degree + 2], ext[degree + 4]]
    if seventh:
        notes.append(ext[degree + 6])
    return [x for x in notes if 0 <= x <= 127]


def build_progression_chords(root: int, intervals: list, steps: list) -> list:
    """Progression steps → one list of MIDI notes per step."""
    return [diatonic_chord(root, intervals, deg, sev) for deg, sev in steps]


def chord_at_bar(chords: list, bar: int, chord_bars: int) -> list:
    """The progression chord sounding at a given bar, looping the progression."""
    return chords[(bar // chord_bars) % len(chords)]


# ---------------------------------------------------------------------------
# Core MIDI helpers
# ---------------------------------------------------------------------------

def events_to_track(events: list, tempo: int) -> MidiTrack:
    """(abs_tick, 'on'|'off', note, velocity) list → MidiTrack."""
    # 'off' < 'on' alphabetically, so note_offs sort before note_ons at same tick
    events = sorted(events, key=lambda e: (e[0], e[1]))
    track = MidiTrack()
    track.append(MetaMessage("set_tempo", tempo=tempo, time=0))
    prev_t = 0
    for abs_t, etype, note, velocity in events:
        delta = abs_t - prev_t
        msg_type = "note_on" if etype == "on" else "note_off"
        track.append(Message(msg_type, note=note, velocity=velocity, time=delta))
        prev_t = abs_t
    return track


def save_mid(events: list, tempo: int, tpb: int, path: str) -> None:
    mid = MidiFile(ticks_per_beat=tpb)
    mid.tracks.append(events_to_track(events, tempo))
    mid.save(path)


# ---------------------------------------------------------------------------
# Pattern generators
# ---------------------------------------------------------------------------

def make_slow_chords(chords, chord_bars, bars, bar_ticks, tpb, tempo, out_dir, key, scale) -> str:
    """Slow chord pads — one progression chord per step, held for the full step."""
    events = []
    bar = 0
    while bar < bars:
        chord = chord_at_bar(chords, bar, chord_bars)
        dur_bars = min(chord_bars, bars - bar)
        t = bar * bar_ticks
        dur_ticks = dur_bars * bar_ticks
        vel = random.randint(40, 65)
        for note in chord:
            events.append((t, "on", note, vel))
            events.append((t + dur_ticks, "off", note, 0))
        bar += dur_bars

    path = os.path.join(out_dir, f"slow_chords_{key}_{scale}.mid")
    save_mid(events, tempo, tpb, path)
    return path


def make_melodic(scale, chords, chord_bars, bars, bar_ticks, tpb, tempo, out_dir, key, scale_name) -> str:
    """
    Stepwise melodic sequence — slow notes with occasional rests.
    Notes lean toward the tones of whichever progression chord is sounding.
    """
    events = []
    total = bars * bar_ticks
    t = 0
    note_lengths = [tpb * 2, tpb * 3, tpb * 4]   # half, dotted half, whole
    rest_lengths = [tpb, tpb * 2]                 # quarter, half rest

    while t < total:
        remaining = total - t
        if random.random() < 0.3:
            t += min(random.choice(rest_lengths), remaining)
            continue

        chord = chord_at_bar(chords, t // bar_ticks, chord_bars)
        chord_pcs = {n % 12 for n in chord}
        chord_tones = [n for n in scale if n % 12 in chord_pcs]
        # 65% chord tone, otherwise anywhere in the scale — colour without clash
        pool = chord_tones if chord_tones and random.random() < 0.65 else scale

        length = min(random.choice(note_lengths), remaining)
        note = random.choice(pool)
        vel = random.randint(45, 70)
        events.append((t, "on", note, vel))
        events.append((t + length, "off", note, 0))
        t += length

    path = os.path.join(out_dir, f"generative_{key}_{scale_name}.mid")
    save_mid(events, tempo, tpb, path)
    return path


def make_bass_drone(chords, chord_bars, bars, bar_ticks, tpb, tempo, out_dir, key, scale) -> str:
    """
    Very slow, low-register drone on the root of each progression chord.
    Steps of 4 bars or longer move to the fifth of the chord halfway through.
    """
    # Fold chord tones into one fixed bass octave (C2–B2) so the drone sits in
    # the same register whichever degree the progression is on.
    def to_bass_register(note: int) -> int:
        return BASS_FLOOR + note % 12

    events = []
    bar = 0
    while bar < bars:
        chord = chord_at_bar(chords, bar, chord_bars)
        dur_bars = min(chord_bars, bars - bar)
        root = to_bass_register(chord[0])
        fifth = to_bass_register(chord[2]) if len(chord) > 2 else root

        # Long steps get a root → fifth move; short ones stay put.
        segments = [(root, dur_bars)]
        if dur_bars >= 4:
            half = dur_bars // 2
            segments = [(root, half), (fifth, dur_bars - half)]

        offset = bar
        for note, seg_bars in segments:
            t = offset * bar_ticks
            vel = random.randint(30, 50)
            events.append((t, "on", note, vel))
            events.append((t + seg_bars * bar_ticks, "off", note, 0))
            offset += seg_bars

        bar += dur_bars

    path = os.path.join(out_dir, f"bass_drone_{key}_{scale}.mid")
    save_mid(events, tempo, tpb, path)
    return path


def make_arp(chords, chord_bars, bars, bar_ticks, tpb, tempo, out_dir, key, scale) -> str:
    """
    Slow arpeggiated pattern — cycles through the tones of the current
    progression chord one by one. Step length: half or dotted-half.
    """
    events = []
    total = bars * bar_ticks
    t = 0
    step_lengths = [tpb * 2, tpb * 3]   # half, dotted-half (ambient pace)
    current_step = -1
    chord = chords[0]
    note_idx = 0

    while t < total:
        remaining = total - t
        step_index = (t // bar_ticks) // chord_bars
        if step_index != current_step:
            chord = chord_at_bar(chords, t // bar_ticks, chord_bars)
            current_step = step_index
            note_idx = 0

        step = min(random.choice(step_lengths), remaining)
        note = chord[note_idx % len(chord)]
        # 15% chance of octave shift for variety
        if random.random() < 0.15:
            shifted = note + random.choice([-12, 12])
            if 0 <= shifted <= 127:
                note = shifted

        vel = random.randint(38, 58)
        gap = int(step * 0.92)   # slight separation between notes
        events.append((t, "on", note, vel))
        events.append((t + gap, "off", note, 0))
        t += step
        note_idx += 1

    path = os.path.join(out_dir, f"arp_{key}_{scale}.mid")
    save_mid(events, tempo, tpb, path)
    return path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Buried Landscapes — Generative Ambient MIDI generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Named progressions:\n"
               + "".join(f"  {name:<10} {spec}\n" for name, spec in PROGRESSIONS.items())
               + "\nExamples:\n"
                 "  python3 midi/generate_ambient_midi.py\n"
                 "  python3 midi/generate_ambient_midi.py --key D --scale dorian --bpm 72\n"
                 "  python3 midi/generate_ambient_midi.py --progression i-VI-III-VII\n"
                 "  python3 midi/generate_ambient_midi.py --progression lament --chord-bars 4\n"
                 "  python3 midi/generate_ambient_midi.py --patterns chords bass --seed 7\n",
    )
    parser.add_argument("--key", default="G", choices=sorted(ROOT_NOTES.keys()),
                        help="Root note (default: G)")
    parser.add_argument("--scale", default="minor", choices=sorted(SCALES.keys()),
                        help="Scale/mode (default: minor)")
    parser.add_argument("--bpm", type=int, default=80,
                        help="Tempo in BPM (default: 80)")
    parser.add_argument("--bars", type=int, default=16,
                        help="Clip length in bars (default: 16)")
    parser.add_argument("--patterns", nargs="+",
                        choices=["chords", "melodic", "bass", "arp"],
                        default=["chords", "melodic", "bass", "arp"],
                        help="Patterns to generate (default: all four)")
    parser.add_argument("--progression", default="random",
                        help="Chord progression shared by chords, arp and bass — a named "
                             "progression (%s), a roman numeral spec like i-VI-III-VII, "
                             "or 'random' (default)" % ", ".join(PROGRESSIONS))
    parser.add_argument("--chord-bars", type=int, default=2,
                        help="Bars per progression step (default: 2)")
    parser.add_argument("--seed", type=int, default=None,
                        help="Random seed for reproducible output")
    parser.add_argument("--output", default=None,
                        help="Output directory (default: ~/MIDI/Buried_Landscapes/Claude_MIDI)")

    args = parser.parse_args()

    if args.bars < 1:
        parser.error("--bars must be at least 1")
    if args.chord_bars < 1:
        parser.error("--chord-bars must be at least 1")
    if args.bpm < 1:
        parser.error("--bpm must be at least 1")

    if args.seed is not None:
        random.seed(args.seed)

    TPB = 480
    tempo = int(60_000_000 / args.bpm)
    bar_ticks = TPB * 4

    root = ROOT_NOTES[args.key]
    intervals = SCALES[args.scale]
    scale_notes = build_scale(root, intervals)

    try:
        if args.progression.strip().lower() == "random":
            steps = random_progression(len(intervals))
        else:
            steps = parse_progression(args.progression, len(intervals))
    except ValueError as exc:
        parser.error(str(exc))

    chords = build_progression_chords(root, intervals, steps)

    out_dir = args.output or os.path.expanduser("~/MIDI/Buried_Landscapes/Claude_MIDI")
    os.makedirs(out_dir, exist_ok=True)

    print(f"Buried Landscapes — {args.key} {args.scale}, {args.bpm}bpm, {args.bars} bars")
    print(f"Progression: {format_progression(steps)} "
          f"({args.chord_bars} bar{'s' if args.chord_bars != 1 else ''} per chord)\n")

    requested = args.patterns
    if "chords" in requested:
        path = make_slow_chords(chords, args.chord_bars, args.bars, bar_ticks, TPB, tempo,
                                out_dir, args.key, args.scale)
        print(f"  {os.path.basename(path)}  →  {path}")
    if "melodic" in requested:
        path = make_melodic(scale_notes, chords, args.chord_bars, args.bars, bar_ticks, TPB,
                            tempo, out_dir, args.key, args.scale)
        print(f"  {os.path.basename(path)}  →  {path}")
    if "bass" in requested:
        path = make_bass_drone(chords, args.chord_bars, args.bars, bar_ticks, TPB, tempo,
                               out_dir, args.key, args.scale)
        print(f"  {os.path.basename(path)}  →  {path}")
    if "arp" in requested:
        path = make_arp(chords, args.chord_bars, args.bars, bar_ticks, TPB, tempo,
                        out_dir, args.key, args.scale)
        print(f"  {os.path.basename(path)}  →  {path}")

    print(f"\nDrop into Ableton on an instrument track. Set project to {args.bpm}bpm.")
