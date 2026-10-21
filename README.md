# ableton-generative-ambient-app

**Buried Landscapes** — a web studio for the [ableton-generative-ambient](https://github.com/rhysgravell/ableton-generative-ambient) scripts: pick a tool, load a MIDI file or adjust settings, and get back new MIDI, a zip of clips, or a report.

Built with Next.js (App Router) + Tailwind v4 from the design in [`design_handoff_buried_landscapes/`](design_handoff_buried_landscapes/README.md). The scripts are copied into [`python/`](python/README.md); `/api/run` runs them with `execFile` in a temp dir and returns the MIDI (base64) plus note data for the piano rolls, read by `python/app/midi_json.py`. The two reference tools (BPM sync, Scale explorer) are computed live in the browser.

### Layout

| Path | What |
|------|------|
| `src/lib/tools.ts` | Tool registry: groups, fields, defaults |
| `src/lib/validate.ts` | Validation shared by the UI and the API |
| `src/lib/theory.ts` | Keys, scales, presets, progression parsing |
| `src/lib/reports.ts` | Report sections (analysis, BPM sync, scales) + copy-as-text |
| `src/app/api/run/route.ts` | Runs a tool's script and shapes the response |
| `src/components/` | `Studio`, shell (rail, mobile picker, welcome), fields, result panel |

## Setup

```bash
pip3 install -r python/requirements.txt

npm install
cp .env.example .env.local   # optional — defaults work out of the box
npm run dev
```

Open http://localhost:3000.

Checks (the same ones CI runs on every PR): `npm run lint`, `npm run typecheck`, `npm test` (Vitest unit tests for `src/lib`), `npm run build`.

## Scripts

| Tool | Runs | Returns |
|------|------|---------|
| Ambient generator | `midi/generate_ambient_midi.py` | Zip of chord / melody / bass / arp clips |
| Drum generator | `midi/generate_drums.py` | Zip of sparse / four-on-the-floor clips |
| Mutate | `midi/mutate_midi.py` | New `<name>_mutated.mid` |
| Change key | `app/change_key.py` | New `<name>_<key>_<scale>.mid` |
| Analyze | `analyze_midi.py`'s key detection via `app/midi_json.py` | Report |
| BPM sync | in the browser | Tables |
| Scale explorer | in the browser | Tables |

To add a tool: a registry entry in `src/lib/tools.ts` and a case in `handle()` in the API route.

## Notes

Runs Python on the server, so it needs a Node host with Python available (local, or a container) — not a static export.
