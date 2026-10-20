import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Analysis, Clip, KeyChange, RunError, RunResponse } from "@/lib/api-types";
import { fileTag, KEYS, SCALE_NAMES, scriptKey } from "@/lib/theory";
import { DETECT, isToolId, TOOL_BY_ID, TRANSFORM_ORDER, usesFile, type ToolId, type TransformState, type Values } from "@/lib/tools";
import { isMidiName, progressionSpec, validate, type Errors, type FileInfo } from "@/lib/validate";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const SCRIPTS_DIR = process.env.SCRIPTS_DIR ?? path.resolve(/* turbopackIgnore: true */ process.cwd(), "python");
const PYTHON = process.env.PYTHON_BIN ?? "python3";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Generator file-name prefixes, in the order results are listed. */
const CLIP_ORDER = ["slow_chords", "generative", "bass_drone", "arp", "sparse_drums", "four_on_floor_drums"];
const AMBIENT_PARTS = ["chords", "melodic", "bass", "arp"];
const DRUM_PATTERNS = ["sparse", "four_on_floor"];
const TRANSFORM_FLAGS: Record<string, string> = {
  transpose: "--transpose",
  humanize: "--humanize",
  reverse: "--reverse",
  stretch: "--stretch",
  velocity: "--velocity-scale",
};

class ScriptError extends Error {}

const fail = (errors: Errors, status = 400) => Response.json({ errors } satisfies RunError, { status });

/** The useful line of a Python failure: argparse's "error:" line or the exception message. */
function scriptMessage(err: unknown): string {
  const e = err as { stderr?: string; stdout?: string; message?: string; code?: string };
  if (e.code === "ENOENT") return `Couldn't start ${PYTHON}. Install Python 3 with mido (pip3 install -r python/requirements.txt).`;
  const lines = (e.stderr || e.stdout || e.message || "").trim().split("\n").filter(Boolean);
  const last = lines.at(-1) ?? "The script failed.";
  if (/No module named 'mido'/.test(last)) return "Python is missing mido. Run pip3 install -r python/requirements.txt.";
  return last.replace(/^\S+\.py: error: /, "").replace(/^\w+Error: /, "");
}

async function python(args: string[], cwd: string) {
  try {
    const { stdout } = await execFileAsync(PYTHON, args, { cwd, timeout: 30_000, maxBuffer: 32 * 1024 * 1024 });
    return stdout;
  } catch (err) {
    throw new ScriptError(scriptMessage(err));
  }
}

const script = (rel: string) => path.join(SCRIPTS_DIR, rel);
const helper = (cmd: string, files: string[], cwd: string) => python([script("app/midi_json.py"), cmd, ...files], cwd);

function resolveSeed(raw: unknown): number {
  const s = String(raw ?? "").trim();
  return s === "" ? 1000 + Math.floor(Math.random() * 8999) : parseInt(s, 10);
}

const int = (v: unknown) => String(Math.round(Number(v)));

/** Run a generator into outDir, rename sharps for safe file names, zip the clips and describe them. */
async function generate(workDir: string, args: string[], zipName: string, seed: number): Promise<RunResponse> {
  const outDir = path.join(workDir, "out");
  await mkdir(outDir);
  const stdout = await python([...args, "--output", outDir], workDir);

  const names: string[] = [];
  for (const f of await readdir(outDir)) {
    const safe = f.replace(/#/g, "s");
    if (safe !== f) await rename(path.join(outDir, f), path.join(outDir, safe));
    names.push(safe);
  }
  const rank = (n: string) => CLIP_ORDER.findIndex((p) => n.startsWith(p + "_"));
  names.sort((a, b) => rank(a) - rank(b));
  if (!names.length) throw new ScriptError("The script produced no files.");

  const paths = names.map((n) => path.join(outDir, n));
  const zipPath = path.join(workDir, zipName);
  await python(["-m", "zipfile", "-c", zipPath, ...paths], workDir);
  const files = JSON.parse(await helper("notes", paths, workDir)) as Clip[];
  const zip = await readFile(zipPath);
  return {
    kind: "zip",
    name: zipName,
    bytes: zip.length,
    seed,
    progression: stdout.match(/^Progression: (\S+)/m)?.[1] ?? null,
    files,
    data: zip.toString("base64"),
  };
}

/** Run a script that writes outName from input, and return it with before/after piano rolls. */
async function single(workDir: string, input: string, outName: string, args: string[], seed: number | null) {
  const outPath = path.join(workDir, outName);
  const stdout = await python([...args, "--output", outPath], workDir);
  const [before, after] = JSON.parse(await helper("notes", [input, outPath], workDir)) as Clip[];
  const data = await readFile(outPath);
  const res = { kind: "single", name: outName, bytes: data.length, seed, before, after, data: data.toString("base64") } as const;
  return { res, stdout };
}

const stem = (input: string) => path.basename(input).replace(/\.midi?$/i, "");

async function handle(tool: ToolId, v: Values, workDir: string, inputPath: string | null): Promise<RunResponse> {
  switch (tool) {
    case "ambient": {
      const seed = resolveSeed(v.seed);
      const parts = (v.parts as string[]).filter((p) => AMBIENT_PARTS.includes(p));
      const args = [
        script("midi/generate_ambient_midi.py"),
        "--key", scriptKey(String(v.key)),
        "--scale", String(v.scale),
        "--bpm", int(v.bpm),
        "--bars", int(v.bars),
        "--chord-bars", int(v.bpc),
        "--progression", progressionSpec(v) ?? "random",
        "--seed", String(seed),
        "--patterns", ...parts,
      ];
      return generate(workDir, args, `ambient_${fileTag(String(v.key))}_${v.scale}_${int(v.bpm)}bpm.zip`, seed);
    }
    case "drums": {
      const seed = resolveSeed(v.seed);
      const patterns = (v.patterns as string[]).filter((p) => DRUM_PATTERNS.includes(p));
      const args = [
        script("midi/generate_drums.py"),
        "--bpm", int(v.bpm),
        "--bars", int(v.bars),
        "--seed", String(seed),
        "--patterns", ...patterns,
      ];
      return generate(workDir, args, `drums_${int(v.bpm)}bpm.zip`, seed);
    }
    case "mutate": {
      const input = inputPath!;
      const tf = v.tf as TransformState;
      const args = [script("midi/mutate_midi.py"), input];
      for (const id of TRANSFORM_ORDER) {
        if (!tf[id]?.on) continue;
        if (id === "reverse") args.push(TRANSFORM_FLAGS[id]);
        else args.push(TRANSFORM_FLAGS[id], String(Number(tf[id].v)));
      }
      const seed = String(v.seed ?? "").trim() === "" ? null : parseInt(String(v.seed), 10);
      if (seed !== null) args.push("--seed", String(seed));
      return (await single(workDir, input, `${stem(input)}_mutated.mid`, args, seed)).res;
    }
    case "rekey": {
      const input = inputPath!;
      const args = [script("app/change_key.py"), input, "--to-key", scriptKey(String(v.key)), "--to-scale", String(v.scale)];
      if (v.fromKey !== DETECT) args.push("--from-key", scriptKey(String(v.fromKey)));
      if (v.fromScale !== DETECT) args.push("--from-scale", String(v.fromScale));
      const outName = `${stem(input)}_${fileTag(String(v.key))}_${v.scale}.mid`;
      const { res, stdout } = await single(workDir, input, outName, args, null);
      return { ...res, keyChange: JSON.parse(stdout) as KeyChange };
    }
    case "analyze": {
      const analysis = JSON.parse(await helper("analyze", [inputPath!], workDir)) as Analysis;
      return { kind: "analysis", analysis };
    }
    default:
      throw new ScriptError(`${TOOL_BY_ID[tool].name} runs in the browser.`);
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const tool = String(form.get("tool") ?? "");
  if (!isToolId(tool) || TOOL_BY_ID[tool].live) return fail({ script: "Unknown tool." });

  let v: Values;
  try {
    v = { ...TOOL_BY_ID[tool].defaults, ...JSON.parse(String(form.get("values") ?? "{}")) };
  } catch {
    return fail({ script: "Settings couldn't be read." });
  }

  const upload = form.get("file");
  const file = upload instanceof File ? upload : null;
  const needsFile = usesFile(tool);
  let info: FileInfo | null = null;
  let bytes: Buffer | null = null;
  if (needsFile && file) {
    if (file.size > MAX_UPLOAD_BYTES) return fail({ file: "That file is over 5 MB. MIDI files are usually far smaller." }, 413);
    bytes = Buffer.from(await file.arrayBuffer());
    // Check the header too: a renamed file shouldn't reach the scripts.
    info = { name: file.name, bad: !isMidiName(file.name) || bytes.subarray(0, 4).toString("latin1") !== "MThd" };
  }

  const errors = validate(tool, v, info);
  if ("key" in v && !KEYS.includes(v.key as never)) errors.key = "Pick a key from the list.";
  if ("scale" in v && !SCALE_NAMES.includes(v.scale as never)) errors.scale = "Pick a scale from the list.";
  if ("fromKey" in v && v.fromKey !== DETECT && !KEYS.includes(v.fromKey as never)) errors.fromKey = "Pick a key from the list.";
  if ("fromScale" in v && v.fromScale !== DETECT && !SCALE_NAMES.includes(v.fromScale as never)) {
    errors.fromScale = "Pick a scale from the list.";
  }
  if (Object.keys(errors).length) return fail(errors);

  const workDir = await mkdtemp(path.join(os.tmpdir(), "bl-"));
  try {
    let inputPath: string | null = null;
    if (needsFile && file && bytes) {
      const name = path.basename(file.name).replace(/[^\w.-]/g, "_") || "input.mid";
      inputPath = path.join(/* turbopackIgnore: true */ workDir, name);
      await writeFile(inputPath, bytes);
    }
    return Response.json(await handle(tool, v, workDir, inputPath));
  } catch (err) {
    if (err instanceof ScriptError) return fail({ script: err.message }, 422);
    throw err;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
