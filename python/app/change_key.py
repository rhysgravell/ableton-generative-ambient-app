#!/usr/bin/env python3
"""
Move a MIDI file into another key for the web app (not part of the copied scripts).

  change_key.py INPUT --to-key G --to-scale minor [--from-key C] [--from-scale major] --output OUT

Each note keeps its scale degree: the 3rd of the old key becomes the 3rd of the new one, so
C major → G minor turns E into B♭. With the same scale on both sides that's a plain transpose.
The root moves by the smaller interval (C → G is down 5, not up 7). Notes outside the source
scale keep their offset from the degree below. Channel 10 (drums) is left alone.

Leave --from-key / --from-scale off to detect them from the notes. Prints the keys used as JSON.
"""

import argparse
import collections
import json
import sys

import mido

from midi_json import NOTE_NAMES, SCALES, key_scores

DRUM_CHANNEL = 9
NOTE_TYPES = ("note_on", "note_off", "polytouch")
# Minor pentatonic notes sit on these minor-scale degrees, so it maps to and from 7-note scales.
PENTATONIC_DEGREES = [0, 2, 3, 4, 6]


def pitches(mid):
    return [
        msg.note
        for track in mid.tracks
        for msg in track
        if msg.type == "note_on" and msg.velocity > 0 and msg.channel != DRUM_CHANNEL
    ]


def detect(notes, key=None, scale=None):
    """Best-fitting key and scale, honouring whichever half was given."""
    fits = [s for s in key_scores(notes) if key in (None, s["key"]) and scale in (None, s["scale"])]
    best = fits[0]["score"]
    tied = [s for s in fits if s["score"] == best]
    # Relative keys share every note (C major = A minor = F lydian): prefer plain major or minor,
    # then the root that's played most.
    tied = [s for s in tied if s["scale"] in ("major", "minor")] or tied
    pcs = collections.Counter(n % 12 for n in notes)
    return max(tied, key=lambda s: pcs[NOTE_NAMES.index(s["key"])])


def mapper(src_key, src_scale, dst_key, dst_scale):
    src_root = NOTE_NAMES.index(src_key)
    shift = (NOTE_NAMES.index(dst_key) - src_root + 6) % 12 - 6
    src_iv = SCALES[src_scale]
    pent_src = len(src_iv) == 5
    pent_dst = len(SCALES[dst_scale]) == 5
    # A pentatonic target is reached through its parent minor scale, then snapped onto its five notes.
    dst_iv = SCALES["minor"] if pent_dst else SCALES[dst_scale]

    def move(note):
        octave, pc = divmod(note - src_root, 12)
        degree = max(i for i, iv in enumerate(src_iv) if iv <= pc)
        chroma = pc - src_iv[degree]
        if pent_src:
            degree = PENTATONIC_DEGREES[degree]
        offset = dst_iv[degree]
        if pent_dst:
            offset = min(SCALES[dst_scale], key=lambda iv: abs(iv - offset))
        return max(0, min(127, src_root + shift + octave * 12 + offset + chroma))

    return move, shift


def main():
    parser = argparse.ArgumentParser(description="Move a MIDI file into another key")
    parser.add_argument("input")
    parser.add_argument("--from-key", choices=NOTE_NAMES)
    parser.add_argument("--from-scale", choices=SCALES)
    parser.add_argument("--to-key", choices=NOTE_NAMES, required=True)
    parser.add_argument("--to-scale", choices=SCALES, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    mid = mido.MidiFile(args.input)
    notes = pitches(mid)
    if not notes:
        sys.exit("The file has no pitched notes to move.")

    detected = args.from_key is None or args.from_scale is None
    src = detect(notes, args.from_key, args.from_scale)
    move, shift = mapper(src["key"], src["scale"], args.to_key, args.to_scale)

    for track in mid.tracks:
        for i, msg in enumerate(track):
            if msg.type in NOTE_TYPES and msg.channel != DRUM_CHANNEL:
                track[i] = msg.copy(note=move(msg.note))
    mid.save(args.output)

    json.dump({
        "from": {"key": src["key"], "scale": src["scale"], "detected": detected, "score": src["score"]},
        "to": {"key": args.to_key, "scale": args.to_scale},
        "shift": shift,
    }, sys.stdout)


if __name__ == "__main__":
    main()
