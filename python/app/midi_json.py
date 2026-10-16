#!/usr/bin/env python3
"""
JSON views of MIDI files for the web app (not part of the copied scripts).

  midi_json.py notes FILE...   → [{name, totalBeats, notes: [[start, dur, pitch, vel], ...]}, ...]
  midi_json.py analyze FILE    → stats + best-fit keys for the Analyze report

Times are in beats. Key detection reuses analyze_midi.py's scales and scoring.
"""

import collections
import json
import sys
from pathlib import Path

import mido

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "midi"))
from analyze_midi import NOTE_NAMES, SCALES  # noqa: E402

MAX_NOTES = 4000  # keep piano-roll payloads small for very dense files


def read(path):
    mid = mido.MidiFile(path)
    tpb = mid.ticks_per_beat
    notes, active = [], collections.defaultdict(list)
    tempos, time_sig, channels = [], None, set()
    tick = 0
    for msg in mido.merge_tracks(mid.tracks):
        tick += msg.time
        if msg.type == "set_tempo":
            tempos.append(msg.tempo)
        elif msg.type == "time_signature" and time_sig is None:
            time_sig = f"{msg.numerator}/{msg.denominator}"
        elif msg.type == "note_on" and msg.velocity > 0:
            active[(msg.channel, msg.note)].append((tick, msg.velocity))
            channels.add(msg.channel + 1)
        elif msg.type in ("note_off", "note_on"):
            starts = active.get((msg.channel, msg.note))
            if starts:
                start, vel = starts.pop(0)
                notes.append([start / tpb, (tick - start) / tpb, msg.note, vel])
    # Notes never switched off run to the end of the file.
    for (_, note), starts in active.items():
        for start, vel in starts:
            notes.append([start / tpb, (tick - start) / tpb, note, vel])
    notes.sort(key=lambda n: (n[0], n[2]))
    total_beats = max([tick / tpb] + [n[0] + n[1] for n in notes])
    tracks = sum(1 for t in mid.tracks if any(m.type == "note_on" for m in t))
    return {
        "mid": mid, "tpb": tpb, "tick": tick, "notes": notes, "tempos": tempos,
        "timeSig": time_sig, "channels": sorted(channels), "tracks": tracks,
        "totalBeats": total_beats,
    }


def notes_view(path):
    r = read(path)
    return {
        "name": Path(path).name,
        "totalBeats": round(r["totalBeats"], 4),
        "noteCount": len(r["notes"]),
        "notes": [[round(s, 4), round(d, 4), p, v] for s, d, p, v in r["notes"][:MAX_NOTES]],
    }


def key_scores(pitches):
    """Every (root, scale) scored like analyze_midi.detect_key_scale, best first."""
    total = len(pitches)
    pcs = collections.Counter(p % 12 for p in pitches)
    scores = []
    for scale_name, intervals in SCALES.items():
        for root in range(12):
            in_scale = sum(pcs[(root + iv) % 12] for iv in set(intervals))
            scores.append((in_scale / total if total else 0.0, NOTE_NAMES[root], scale_name))
    # Stable sort keeps analyze_midi's tie-break (first scale/root wins).
    scores.sort(key=lambda s: -s[0])
    return [{"key": k, "scale": s, "score": round(sc, 4)} for sc, k, s in scores]


def analyze_view(path):
    r = read(path)
    pitches = [n[2] for n in r["notes"]]
    vels = [n[3] for n in r["notes"]]
    tempo = sum(r["tempos"]) / len(r["tempos"]) if r["tempos"] else 500_000
    return {
        "name": Path(path).name,
        "bpm": round(60_000_000 / tempo, 2),
        "tempoSet": bool(r["tempos"]),
        "tempoChanges": len(r["tempos"]),
        "timeSig": r["timeSig"],
        "seconds": round(mido.tick2second(r["tick"], r["tpb"], int(tempo)), 2),
        "totalBeats": round(r["totalBeats"], 4),
        "noteCount": len(pitches),
        "tracks": r["tracks"],
        "channels": r["channels"],
        "velocity": {"min": min(vels), "max": max(vels), "mean": round(sum(vels) / len(vels), 1)} if vels else None,
        "pitch": {"min": min(pitches), "max": max(pitches)} if pitches else None,
        "pitchClasses": [sum(1 for p in pitches if p % 12 == pc) for pc in range(12)],
        "keys": key_scores(pitches)[:3] if pitches else [],
    }


if __name__ == "__main__":
    cmd, files = sys.argv[1], sys.argv[2:]
    if cmd == "notes":
        out = [notes_view(f) for f in files]
    elif cmd == "analyze":
        out = analyze_view(files[0])
    else:
        sys.exit(f"unknown command: {cmd}")
    json.dump(out, sys.stdout)
