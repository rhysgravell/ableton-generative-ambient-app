"""Tests for the app's own scripts in python/app (run: python -m unittest discover -s python/tests)."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import mido

APP = Path(__file__).resolve().parent.parent / "app"
sys.path.insert(0, str(APP))

from change_key import detect, mapper  # noqa: E402
from midi_json import NOTE_NAMES, SCALES, key_scores, merge, notes_view  # noqa: E402

C = 60


def scale_notes(key, scale, octaves=(4, 5)):
    root = NOTE_NAMES.index(key)
    return [12 * (o + 1) + root + iv for o in octaves for iv in SCALES[scale]]


def save(tracks, path, type=1):
    mid = mido.MidiFile(type=type, ticks_per_beat=480)
    mid.tracks.extend(tracks)
    mid.save(path)


def note_track(pitches, channel=0, beat=480):
    track = mido.MidiTrack()
    for p in pitches:
        track.append(mido.Message("note_on", note=p, velocity=80, time=0, channel=channel))
        track.append(mido.Message("note_off", note=p, velocity=0, time=beat, channel=channel))
    return track


class MapperTest(unittest.TestCase):
    def test_same_scale_is_a_transpose_by_the_smaller_interval(self):
        move, shift = mapper("C", "major", "G", "major")
        self.assertEqual(shift, -5)
        self.assertEqual([move(n) for n in range(40, 90)], [n - 5 for n in range(40, 90)])

    def test_notes_keep_their_scale_degree(self):
        move, _ = mapper("C", "major", "C", "minor")
        # E, A and B are the 3rd, 6th and 7th: they drop to E♭, A♭ and B♭.
        self.assertEqual([move(n) for n in (64, 69, 71)], [63, 68, 70])
        self.assertEqual([move(n) for n in (60, 62, 65, 67)], [60, 62, 65, 67])

    def test_scale_notes_land_in_the_target_scale(self):
        for src in SCALES:
            for dst in SCALES:
                move, _ = mapper("D", src, "A", dst)
                target = {(NOTE_NAMES.index("A") + iv) % 12 for iv in SCALES[dst]}
                for n in scale_notes("D", src):
                    self.assertIn(move(n) % 12, target, f"{src} → {dst}, note {n}")

    def test_out_of_scale_notes_stay_below_the_next_degree(self):
        # C minor's raised 7th (B natural) settles on C major's B rather than doubling C.
        move, _ = mapper("C", "minor", "C", "major")
        self.assertEqual(move(71), 71)
        # F♯ in C major is already lydian's 4th.
        move, _ = mapper("C", "major", "C", "lydian")
        self.assertEqual(move(66), 66)

    def test_out_of_range_notes_fold_back_by_octaves(self):
        move, _ = mapper("C", "major", "F", "major")
        moved = [move(n) for n in (124, 126)]
        self.assertTrue(all(0 <= m <= 127 for m in moved))
        self.assertEqual(len(set(moved)), 2, "clamping would stack them on one pitch")
        move, _ = mapper("B", "major", "C", "major")
        self.assertTrue(all(0 <= move(n) <= 127 for n in range(128)))


class DetectTest(unittest.TestCase):
    def test_prefers_plain_major_or_minor_rooted_on_the_most_played_note(self):
        a_minor = scale_notes("A", "minor") + [57] * 8
        self.assertEqual((detect(a_minor)["key"], detect(a_minor)["scale"]), ("A", "minor"))
        c_major = scale_notes("C", "major") + [C] * 8
        self.assertEqual((detect(c_major)["key"], detect(c_major)["scale"]), ("C", "major"))
        # D is played most, but D dorian is a mode of the same notes: major/minor wins first.
        leaning_on_d = scale_notes("C", "major") + [C] * 3 + [62] * 8
        self.assertEqual((detect(leaning_on_d)["key"], detect(leaning_on_d)["scale"]), ("C", "major"))

    def test_honours_whichever_half_was_given(self):
        notes = scale_notes("C", "major")
        self.assertEqual(detect(notes, key="D")["key"], "D")
        self.assertEqual(detect(notes, key="D")["scale"], "dorian")
        self.assertEqual(detect(notes, scale="lydian")["key"], "F")


class ChangeKeyScriptTest(unittest.TestCase):
    def run_script(self, src, *args):
        out = Path(self.tmp.name) / "out.mid"
        res = subprocess.run(
            [sys.executable, str(APP / "change_key.py"), str(src), *args, "--output", str(out)],
            capture_output=True, text=True,
        )
        return res, out

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.src = Path(self.tmp.name) / "in.mid"

    def test_moves_pitched_notes_and_leaves_drums_alone(self):
        save([note_track([60, 64, 67]), note_track([36, 38], channel=9)], self.src)
        res, out = self.run_script(self.src, "--from-key", "C", "--from-scale", "major", "--to-key", "D", "--to-scale", "major")
        self.assertEqual(res.returncode, 0, res.stderr)
        report = json.loads(res.stdout)
        self.assertEqual((report["from"]["detected"], report["shift"]), (False, 2))
        played = [m for t in mido.MidiFile(out).tracks for m in t if m.type == "note_on"]
        self.assertEqual([m.note for m in played if m.channel == 0], [62, 66, 69])
        self.assertEqual([m.note for m in played if m.channel == 9], [36, 38])

    def test_refuses_a_move_to_the_key_it_is_already_in(self):
        save([note_track([60, 64, 67])], self.src)
        res, _ = self.run_script(self.src, "--from-key", "C", "--from-scale", "major", "--to-key", "C", "--to-scale", "major")
        self.assertNotEqual(res.returncode, 0)
        self.assertIn("already looks like C major", res.stderr)

    def test_refuses_a_file_with_only_drums(self):
        save([note_track([36], channel=9)], self.src)
        res, _ = self.run_script(self.src, "--to-key", "D", "--to-scale", "minor")
        self.assertNotEqual(res.returncode, 0)
        self.assertIn("no pitched notes", res.stderr)


class MidiJsonTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dir = Path(self.tmp.name)

    def test_notes_are_in_beats_and_unfinished_notes_run_to_the_end(self):
        track = note_track([60, 62])
        track.append(mido.Message("note_on", note=64, velocity=90, time=0))
        track.append(mido.Message("note_on", note=65, velocity=0, time=960))  # stray off, ignored
        save([track], self.dir / "a.mid")
        view = notes_view(self.dir / "a.mid")
        self.assertEqual(view["notes"], [[0, 1, 60, 80], [1, 1, 62, 80], [2, 2, 64, 90]])
        self.assertEqual(view["totalBeats"], 4)

    def test_merge_keeps_every_track_in_one(self):
        tempo = mido.MidiTrack([mido.MetaMessage("set_tempo", tempo=600_000)])
        save([tempo, note_track([60, 64]), note_track([48], channel=1)], self.dir / "multi.mid")
        merge(self.dir / "multi.mid", self.dir / "flat.mid")
        flat = mido.MidiFile(self.dir / "flat.mid")
        self.assertEqual((flat.type, len(flat.tracks)), (0, 1))
        played = [(m.channel, m.note) for m in flat.tracks[0] if m.type == "note_on"]
        self.assertEqual(sorted(played), [(0, 60), (0, 64), (1, 48)])
        self.assertTrue(any(m.type == "set_tempo" for m in flat.tracks[0]))

    def test_key_scores_rank_a_full_scale_first(self):
        scores = key_scores(scale_notes("E", "phrygian"))
        self.assertEqual(scores[0]["score"], 1.0)
        self.assertIn({"key": "E", "scale": "phrygian", "score": 1.0}, scores)
        self.assertEqual(scores, sorted(scores, key=lambda s: -s["score"]))


if __name__ == "__main__":
    unittest.main()
