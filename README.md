# ableton-generative-ambient-app

Web front-end for running the [ableton-generative-ambient](https://github.com/rhysgravell/ableton-generative-ambient) scripts: pick a script, load a MIDI file, get a new one back.

Built with Next.js (App Router) + Tailwind v4. The `/api/run` route handler writes the upload to a temp dir, runs the Python script with `execFile`, and returns the output file (or the script's text report).

## Setup

```bash
# Scripts repo alongside this one (or set SCRIPTS_REPO_PATH)
git clone https://github.com/rhysgravell/ableton-generative-ambient ../ableton-generative-ambient
pip3 install mido

npm install
cp .env.example .env.local   # optional — defaults work for the layout above
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script | Output |
|--------|--------|
| `midi/mutate_midi.py` | New `<name>_mutated.mid` (transpose, humanize, reverse, stretch, velocity scale) |
| `midi/analyze_midi.py` | Text report (BPM, key detection, velocity stats) |

Add more in `src/lib/scripts.ts` — each entry maps form fields to CLI flags.

## Notes

Runs Python on the server, so it needs a Node host with Python available (local, or a container) — not a static export.
