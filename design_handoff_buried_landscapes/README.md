# Handoff: Buried Landscapes — generative ambient MIDI studio

## Overview
A web front end for a set of music scripts. The user picks a tool, uploads a MIDI file or adjusts settings, runs it, and gets back a `.mid`, a `.zip` of `.mid`s, or a text report. The audience is electronic/ambient musicians who know theory terms but don't want a CLI. Target stack: **Next.js (App Router) + Tailwind CSS**. Must work on desktop and on phones about 400px wide. Dark-first, with a light theme.

## About the Design Files
The files in this bundle are **design references built in HTML**. They are prototypes that show the intended look and behavior, not production code to copy. Recreate them in Next.js + Tailwind using idiomatic React components. `Studio.dc.html` holds the whole app: all logic, mock data and inline styles are in the `<script data-dc-script>` class at the bottom of the file. `Buried Landscapes.dc.html` is a canvas that mounts Studio in every key state. Open either file directly in a browser.

The scripts' API is **not** implemented. All results are mocked client-side (see "Mock vs real" below).

## Fidelity
**High-fidelity.** Colors, type, spacing, radii and interactions are final. Match them closely.

## Architecture (recommended)
```
app/page.tsx                     → <Studio/>
lib/tools.ts                     → TOOL REGISTRY (id, group, name, blurb, output kind, fields[], live?)
components/shell/Rail.tsx        → desktop sidebar (≥ md)
components/shell/ToolPicker.tsx  → mobile dropdown (< md)
components/fields/*              → one component per field type (see below)
components/FieldRenderer.tsx     → switch on field.type
components/RunBar.tsx
components/result/ResultPanel.tsx → idle | running | error | zip | single | report
components/result/ZipResult.tsx, SingleResult.tsx, Report.tsx, PianoRoll.tsx
```
**Extensibility is a hard requirement.** Each tool is data: `{ id, group: 'Generate'|'Transform'|'Reference', name, blurb, out: '.zip'|'.mid'|'report'|'table', outLong, verb, busy, live?: boolean, fields: Field[] }`. Field types: `select | number | slider | toggle | multi | text | file`, plus two custom blocks, `progression` and `transforms`. A new script should only need a new registry entry (and a custom field type only when it's truly bespoke). The exact schemas are in `SCHEMA` / `TOOLS` / `DEF` in `Studio.dc.html`.

## Tools, fields & defaults
**Ambient generator** → zip. key (select C, C♯, D, E♭, E, F, F♯, G, A♭, A, B♭, B; default G) · scale (minor, dorian, phrygian, lydian, mixolydian, major, pentatonic; default minor) · tempo 20–300 BPM (80) · length 1–256 bars (16) · progression (mode: Preset | Numerals | Random; presets drift `i-VI-III-VII`, lament `i-iv-VI-v`, descent `i-VII-VI-v`, suspended `i-IV-i-IV`, bloom `VI-VII-i-III`, static `i`. **These numerals are placeholders; replace them with the scripts' real presets**) · bars per chord 1–16 (4) · seed (optional integer) · parts multi: Chord pads / Melody / Bass drone / Arpeggio (all on).
Output names: `slow_chords_{Key}_{scale}.mid`, `melody_…`, `bass_drone_…`, `arpeggio_…`. Sharps and flats become `s`/`b` in file names. Zip: `ambient_{Key}_{scale}_{bpm}bpm.zip`.

**Drum generator** → zip. tempo (80), length (16), seed, patterns multi: Sparse / Four on the floor.

**Mutate** → single `.mid` (`{name}_mutated.mid`). file · transforms (stack in order; ≥1 required): Transpose −24…+24 st (default on, −3), Humanize 0–1 slider step .05 (on, 0.35), Reverse (off), Time-stretch ×0.25–8 step .25 (off, 2), Velocity scale ×0.1–2 step .05 (off, 0.8) · seed.

**Analyze** → report. file · "Note distribution" toggle (on). Report: headline best-guess key + confidence + alternates; Summary kv (tempo, time signature, duration, notes, velocity range/mean, pitch range); optional per-pitch-class bars.

**BPM sync** (live, no Run) → tables. tempo. Divisions 4 bars, 2 bars, 1 bar, 1/2, 1/4, 1/8, 1/16, 1/32. `ms = 240000 / bpm / n`; dotted ×1.5, triplet ×⅔; `Hz = 1000/ms`. ms shown to 1 dp if ≥100, else 2 dp. Hz shown to 2 dp if ≥10, else 3 dp. The 1/4 row is highlighted. Headline: one beat in ms.

**Scale explorer** (live) → tables. key, scale. Notes table (degree, note+octave from octave 4, MIDI, Hz at A4=440). Chords table (numeral, chord, notes, quality; triads for 7-note scales). Related modes as kv (rotations; pentatonic shows its relative major pentatonic). Flats vs sharps: use flats when the parent major key is F, B♭, E♭, A♭, D♭ or G♭.

## Screens / layout
### Desktop (≥ 768px; designed at 1240×800)
- Root: full-height flex row. Background `--bg` plus `radial-gradient(1100px 520px at 88% -12%, var(--glow), transparent 62%)`.
- **Rail**: 236px wide, padding 26/14/18, right border `--line-soft`, bg `--rail`. Wordmark is three accent bars (28/20/12px wide, 2px tall, opacities 1/.55/.25, gap 3) above "Buried / Landscapes" in serif italic 300 25px/1.02. Groups are gap 22; each group label is mono 10.5px uppercase, tracking .14em, `--text-3`. Items are 38px tall, radius 9, padding 0 10, sans 500 14px: a 6px dot, the name, and a mono 10.5px output tag. Selected item: bg `--raised`, inset 1px `--line-soft` ring, accent dot with a 3px `--accent-soft` halo. Footer: a Dark/Light segmented control and a mono caption.
- **Header**: padding 30/40/24. Group label (mono caps), title serif 300 38px/1.05 tracking −.01em, blurb sans 14.5/1.55 `--text-2` (max 640px). Right side: "returns {outLong}" mono 12px.
- **Workspace**: flex row, gap 28, padding 0 40 28.
  - **Settings column**: 396px. The field area scrolls. Fields sit in a 2-col grid, gap 22 (rows) × 14 (cols); `half` fields span 1 column, others span both.
  - **RunBar** (pinned at the bottom of the column; border-top `--line-soft`, padding-top 16): the button, then a row with "Reset to defaults" on the left and a hint on the right ("Defaults are ready to run" / "Settings kept — change one and run again").
  - **Result panel**: flex 1, bg `--sunk`, 1px `--line-soft`, radius 18, padding 24/30/32, scrolls on its own. Header row: "RESULT" (or "REFERENCE") mono caps, plus run meta on the right (`run 3 · 1.3 s`, or `live`).
- **Empty / first visit** (no tool selected): instead of the header and workspace, show a hero, "Six tools for *slow music.*" (serif 300 54px, italic on the second phrase), a 16px intro, and a 3-column grid (Generate / Transform / Reference) of tool cards (radius 14, padding 18, min-height 132, name in serif 22px, blurb 13.5px, hover border `--accent-line`). Faint horizontal "strata" lines fill the bottom 42%: `repeating-linear-gradient(180deg, transparent 0 15px, var(--line-soft) 15px 16px)` with a top-to-bottom fade mask.

### Mobile (< 768px; designed at 400×860)
- A single scrolling column. Top bar: wordmark in serif italic 22px, and a "Light mode"/"Dark mode" pill (36px tall).
- With no tool selected: intro text, and the picker is open.
- **ToolPicker**: a 58px button (group caption + tool name + "change"/"close") that expands an inline grouped list (48px rows).
- Header: padding 24/18/20, title 30px.
- Settings stack (the 2-col grid is kept for half fields). The **RunBar is `position: sticky; bottom: 0`** with a fade background (`linear-gradient(to bottom, transparent, var(--bg) 30%)`).
- The result panel follows the settings (radius 16, padding 20/18/24). Results show inline under the settings; there is no separate screen.

### Animated sine-wave background (welcome screen)
An animated `<canvas>` sits behind the welcome hero and tool cards. It is absolutely positioned at `inset:0` with `pointer-events:none`, layered after the strata lines and before the content.
- Color token `--wave`: dark `oklch(0.56 0.09 165)`, light `oklch(0.6 0.07 172)`. Read it from computed style on every frame so theme switches apply immediately.
- Five waves. For each wave `{a: amplitude (fraction of H), k: cycles across width, s: speed, y: centre (fraction of H), al: alpha, w: lineWidth}`:
  `{.24,1.1,.07,.60,.6,1.6}`, `{.17,1.7,-.05,.63,.4,1.3}`, `{.30,.7,.035,.66,.32,1.1}`, `{.12,2.6,.09,.57,.26,1}`, `{.20,1.35,-.025,.70,.2,1}`
- Per frame (`t` in seconds, `u = x/W`, step x by 4px):
  `breathe = .75 + .25*sin(t*.18 + i*1.3)`
  `y = H*y0 + sin(u*2π*k + t*s*2π + i)*H*a*breathe + sin(u*2π*k*2.3 - t*s*3 + i*2)*H*a*.18`
- Scale the canvas for devicePixelRatio (capped at 2) and resize with a ResizeObserver. Under `prefers-reduced-motion: reduce`, draw one static frame and stop.
- Tool cards on the welcome screen are now translucent so the waves show through: `background: color-mix(in oklch, var(--raised) 72%, transparent); backdrop-filter: blur(3px)`.
- Implement it as a client component, `components/WaveBackground.tsx` (`'use client'`, with `useEffect` + `requestAnimationFrame`, cleaning up on unmount). The source is `function Waves()` in `Studio.dc.html`.

## Components (exact specs)
- **Field label row**: label sans 500 13px `--text-2`; optional hint mono 11.5px `--text-3`, right-aligned. Gap to the control: 9px.
- **Control box** (select, number, text): height 46, radius 11, bg `--raised`, 1px `--line`. Error state: border `--err` plus `box-shadow: 0 0 0 3px var(--err-soft)`.
- **NumberStepper**: −/+ buttons 40px wide (`--text-3`; on hover `--text` with bg `--hover`), value mono 500 15px tabular, right-aligned, then the unit in sans 12px `--text-3`. Clamp and snap to `step` on ±. Typing an out-of-range value shows "Use a value from {min} to {max}." live.
- **Select**: native `<select>`, `appearance: none`, padding 0 34 0 14, sans 500 15px, mono "▾" at right 14px.
- **Segmented**: sunk track, padding 3, radius 11. Each option is 32px tall, radius 8, sans 500 13px. The selected option gets bg `--raised` and an inset `--line-soft` ring; the rest use `--text-3`.
- **CheckCard** (multi): 2-col grid, gap 8. Card padding 13, min-height 62, radius 12. Off: `--raised` with a `--line-soft` border. On: `--accent-soft` with an `--accent-line` border. 18px checkbox, radius 5; checked = accent fill with a ✓ in `--accent-ink`.
- **Toggle row**: card with min-height 60, padding 12/16, radius 12. Switch 40×24 (on: accent track and accent-ink knob; off: `--line` track and `--text-2` knob). Knob 18px; animate `left` 3→19 over .2s.
- **Progression block**: Segmented (Preset/Numerals/Random) → preset grid (3 cols, gap 8; chip padding 11/12, radius 11, name in serif italic 18px, numerals in mono 10.5px) OR a numerals text input (mono, with an "I–VII" suffix) OR a dashed note for Random → the resolved chord tokens (`Gm` mono 500 13 + `i` mono 10.5 at .7 opacity; padding 7/10, radius 8). An invalid token shows "?" in `--err` on `--err-soft` with an `--err` border. Then a caption: "{bpc} bars each · loops every {n×bpc} bars".
- **TransformRow** list: one card (radius 12), rows ≥58px separated by `--line-soft`. Checkbox + label (500 14) + sub (12, `--text-3`). When a row is on, it shows an inline stepper (124×36, radius 9, bg `--bg`) or a slider (custom track 4px `--line`, accent fill, 16px knob in `--text` with a 4px `--accent-soft` halo, and a transparent native range input on top). Rows that are off show "off" in mono. Under the list: "applied in order: transpose → humanize".
- **Dropzone**: min-height 128, radius 14, 1.5px dashed `--line`. Copy: "Drop a MIDI file here" (serif italic 300 21px) and "or browse · .mid or .midi". Drag-over: accent dashed border with `--accent-soft` fill. Error: `--err` border with `--err-soft` fill. Under it, a link: "No file handy? Use a sample loop". Accept `.mid,.midi,audio/midi`.
- **FileCard**: min-height 66, radius 14. A 44px thumb tile ("MIDI" mono 10px on accent-soft; for a bad file, the file extension in `--err` on `--err-soft`), the name in mono 13.5 (ellipsis), meta 12px, a "Replace" label/file input, and a 32px × remove button. The card is also a drop target.
- **FieldError**: 6px `--err` dot + sans 13/1.45 `--err`, directly under the field.
- **RunButton**: height 52, radius 13, padding 0 20, sans 600 15. Bg `--accent`, text `--accent-ink`, label on the left and "⌘ ↵" mono 12px at .65 opacity on the right (hidden on mobile). **Running**: bg `--accent-soft`, text `--accent`, 1px `--accent-line` border, label "{busy}…" (Generating / Mutating / Reading). A 40%-wide band `linear-gradient(90deg, transparent, var(--accent-soft), transparent)` drifts across, `@keyframes translateX(-120%→330%)`, 2.6s ease-in-out infinite. Clicks are ignored while running.
- **ResultPanel states**:
  - *idle*: strata texture, a serif italic 27px title ("Nothing generated yet." / "Bring a MIDI file." / "{file} is ready."), and a 14px body.
  - *running*: serif title (e.g. "Layering 4 clips…"), a subline, and one skeleton card per expected file, each with the drifting band (staggered .25s).
  - *error*: "DIDN'T RUN" kicker in mono `--err` with a dot; serif 28px "One setting needs a look." (or "{n} settings need a look."); one row per error (label | message) with `--line-soft` dividers; footer "Everything else is kept as you left it."
  - *zip*: serif 300 32px title ("Four clips"), then the zip name and meta in mono 12.5; a primary "Download .zip ↓" button (44px, radius 11). Settings-summary pills (mono 11.5, 1px `--line-soft`, fully rounded), plus a "reuse seed" pill (accent-soft; when locked it switches to the accent fill and reads "seed locked"; clicking it toggles the seed into the Seed field). Then the file rows: name in mono 500 13.5 and "16 bars · 64 notes", above a **PianoRoll** 50px tall, radius 7, bg `--bg`, with vertical grid lines every 25% (`repeating-linear-gradient(90deg, var(--line-soft) 0 1px, transparent 1px 25%)`) and notes as absolutely positioned accent rectangles whose opacity follows velocity.
  - *single*: "One new clip", the file name and meta, transform pills (accent text on accent-soft), a 150px piano roll showing the original notes as ghosts (`--text-3` at .28) under the mutated notes in accent, a legend, and a "Download .mid ↓" button.
  - *report*: serif 32px title, a 13px sub, and a "Copy as text" button (38px, bordered; it reads "Copied" for 1.5s). Sections are separated by 30px; each has a header made of a mono caps title, a hairline and an optional note. Section types: **head** (serif 300 46px figure plus a mono caption), **kv** (grid 8.5rem | 1fr, 10px rows, dashed `--line-soft` dividers, mono 500 14 values with sans 12.5 `--text-3` notes), **table** (CSS grid rows rather than `<table>`; header mono 10.5 caps `--text-3` with a `--line` bottom border; cells mono 13.5 tabular with `--line-soft` dividers; the first column is 500 weight `--text-2`; numeric columns are right-aligned; the highlighted row is accent-soft with radius 8 and its first cell in accent; wrapped in `overflow-x:auto`, min-width 320), **bars** (label 2.4rem | 6px track | count). The same section data also produces the plain-text "Copy" output.

## Interactions & behavior
- Switching tools keeps each tool's settings and its last result (state is stored per tool). The uploaded file is shared between Mutate and Analyze.
- **Run**: validate → if there are errors, set phase `error`, show each error inline under its field, and list them all in the panel. Otherwise set phase `running` and call the API. When it returns, set phase `done` and store the result. Settings are never cleared. `⌘/Ctrl+Enter` runs the current tool.
- Editing a field clears that field's run-time error. When every error is fixed, the panel falls back to the previous result, or to idle.
- **Live validation** (shown as you type): numbers out of range; seed not an integer ("Seeds are whole numbers, e.g. 4127."); progression numerals (regex `^([b#♭♯]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|o|\+|7|maj7|sus2|sus4)?$`, tokens split on space, comma, or hyphen/dash; message: "“ix” isn't a scale degree. Use I–VII — uppercase for major, lowercase for minor, e.g. i-VI-III-VII."); bars per chord greater than length; a non-MIDI file (checked on drop by extension; audio files get "is audio, not MIDI. Export the part as a .mid…").
- **Run-time validation**: no parts or patterns selected; no file; Mutate with zero transforms ("Turn on at least one transform. They stack, so any combination works.").
- Reference tools are **live**: no RunBar; instead a caption "Updates as you change settings — no run needed." The panel recomputes on every change and shows the error summary if any input is invalid.
- Reset to defaults restores that tool's `DEF` values and clears its errors.
- Theme: toggle `data-theme="dark|light"` on `<html>` and persist it in localStorage. Default to dark (optionally follow `prefers-color-scheme`).
- Mobile: after a run, scroll the result panel into view (`scroll-margin-top: 16px`).

## State
`tool: ToolId | null`, `vals: Record<ToolId, Values>`, `file: {name,size,meta,bad} | null`, `runs: Record<ToolId, {phase:'idle'|'running'|'done'|'error', n, ms, result}>`, `errs: Record<ToolId, Record<fieldId,string>>`, `theme`, `menuOpen` (mobile), `drag`, `copied`.
Result union: `{kind:'zip', name, meta, files:[{name, meta, notes[]}], summary[], seed}` | `{kind:'single', name, meta, ops[], notes[]}` | `{kind:'report', title, sub, sections[]}`. The backend should return MIDI blobs plus enough metadata (file names, bar and note counts, and optionally note lists for the piano roll) to fill these.

## Mock vs real
In the prototype, `compute()` makes up all results: piano rolls are seeded random notes, Analyze always returns D dorian, and the download buttons do nothing. In production, the scripts produce these and the buttons download the returned blob or zip. Keep the run-count and duration meta.

## Design tokens (CSS variables → Tailwind `theme.extend.colors` as `var(--…)`)
| token | dark | light |
|---|---|---|
| --bg | oklch(0.17 0.012 250) | oklch(0.968 0.006 85) |
| --rail | oklch(0.155 0.011 250) | oklch(0.95 0.008 85) |
| --raised | oklch(0.215 0.013 250) | oklch(0.99 0.004 85) |
| --sunk | oklch(0.145 0.011 250) | oklch(0.945 0.009 85) |
| --hover | oklch(0.25 0.013 250) | oklch(0.925 0.01 85) |
| --line | oklch(0.33 0.014 250) | oklch(0.84 0.012 85) |
| --line-soft | oklch(0.255 0.012 250) | oklch(0.9 0.01 85) |
| --text | oklch(0.94 0.01 85) | oklch(0.22 0.018 250) |
| --text-2 | oklch(0.77 0.014 250) | oklch(0.42 0.018 250) |
| --text-3 | oklch(0.61 0.016 250) | oklch(0.51 0.016 250) |
| --accent | oklch(0.82 0.075 165) | oklch(0.47 0.075 175) |
| --accent-ink | oklch(0.2 0.03 165) | oklch(0.98 0.01 175) |
| --accent-soft | oklch(0.82 0.075 165 / .12) | oklch(0.47 0.075 175 / .09) |
| --accent-line | oklch(0.82 0.075 165 / .45) | oklch(0.47 0.075 175 / .45) |
| --err | oklch(0.78 0.11 45) | oklch(0.52 0.15 38) |
| --err-soft | oklch(0.78 0.11 45 / .14) | oklch(0.52 0.15 38 / .1) |
| --glow | oklch(0.55 0.06 200 / .16) | oklch(0.88 0.035 200 / .4) |
| --wave | oklch(0.56 0.09 165) | oklch(0.6 0.07 172) |

**Fonts** (Google Fonts via `next/font`): serif **Newsreader** 300/400 plus italic (titles, figures, empty states); sans **Instrument Sans** 400/500/600 (UI); mono **JetBrains Mono** 400/500 (numbers, file names, numerals, tables; always `tabular-nums`).
**Type sizes**: 54 hero · 46 report figure · 38 tool title (30 on mobile) · 32 result title · 27/26 panel title · 22 card/wordmark · 15–14.5 body/controls · 13.5 table · 13 labels/errors · 12 meta · 10.5 mono caps (tracking .14em).
**Radii**: 5 checkbox · 8 tokens/table highlight · 9 rail item/compact stepper · 11 inputs/presets/segmented · 12 cards/lists · 13 run button · 14 dropzone/file card/tool card · 16 mobile panel · 18 desktop panel · 999 pills.
**Spacing**: 6 · 8 · 9 · 12 · 14 · 18 · 22 · 28 · 40. Page padding 40 on desktop, 18 on mobile.
**Heights**: inputs 46 · run button 52 · rail item 38 · mobile rows ≥48 · touch targets ≥44.
**Shadows**: only focus/error rings (`0 0 0 3px var(--err-soft)`) and dot halos (`0 0 0 3px var(--accent-soft)`). No drop shadows.
**Motion**: toggles .2s; the running band 2.6s ease-in-out; the welcome-screen waves (see above). Keep everything else instant so repeat use stays fast.

## Assets
None. There are no icons or images; glyphs are text (− + ▾ ✓ × ↓ ⌘ ↵).

## Files
- `Studio.dc.html`: the full interactive prototype. Its logic (schema, validation, theory helpers, report builders) is in the script at the bottom and can be ported almost directly to `lib/`.
- `Buried Landscapes.dc.html`: a canvas of every key state (1a–5c) plus tokens and component specimens (6a–6c).
- `support.js`: the runtime needed to open the `.dc.html` files in a browser (reference only).
