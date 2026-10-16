# ableton-generative-ambient-app

Web front-end for running the [ableton-generative-ambient](https://github.com/rhysgravell/ableton-generative-ambient) scripts: pick a script, load a MIDI file, get a new one back.

Built with Next.js (App Router) + Tailwind v4. The scripts are copied into [`python/`](python/README.md). The `/api/run` route handler runs one with `execFile` in a temp dir and returns the output file, a zip of files, or the script's text report.

## Setup

```bash
pip3 install -r python/requirements.txt

npm install
cp .env.example .env.local   # optional — defaults work out of the box
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script | Input | Output |
|--------|-------|--------|
| `midi/generate_ambient_midi.py` | — | Zip of chords / melodic / bass / arp clips |
| `midi/generate_drums.py` | — | Zip of sparse / four-on-floor drum clips |
| `midi/mutate_midi.py` | MIDI file | New `<name>_mutated.mid` |
| `midi/analyze_midi.py` | MIDI file | Text report (BPM, key detection, velocity stats) |
| `tools/bpm_sync.py` | — | Delay / LFO sync table |
| `tools/scale_explorer.py` | — | Scale notes, chords and modes |

Add more in `src/lib/scripts.ts` — each entry maps form fields to CLI flags.

## Notes

Runs Python on the server, so it needs a Node host with Python available (local, or a container) — not a static export.
