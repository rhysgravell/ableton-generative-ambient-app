import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getScript, type ScriptDef } from "@/lib/scripts";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const SCRIPTS_DIR = process.env.SCRIPTS_DIR ?? path.resolve(/* turbopackIgnore: true */ process.cwd(), "python");
const PYTHON = process.env.PYTHON_BIN ?? "python3";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

class BadRequest extends Error {}

function buildArgs(script: ScriptDef, form: FormData): string[] {
  const flagged: string[] = [];
  const positional: string[] = [];
  for (const opt of script.options) {
    const push = (...values: string[]) =>
      opt.flag ? flagged.push(opt.flag, ...values) : positional.push(...values);

    if (opt.kind === "boolean") {
      if (form.get(opt.name) === "on") flagged.push(opt.flag);
      continue;
    }
    if (opt.kind === "multi") {
      const picked = form.getAll(opt.name).map(String).filter((v) => opt.choices.includes(v));
      if (picked.length) push(...picked);
      continue;
    }

    const value = String(form.get(opt.name) ?? "").trim();
    if (value === "") continue;
    if (opt.kind === "number" && !Number.isFinite(Number(value))) {
      throw new BadRequest(`${opt.label} must be a number`);
    }
    if (opt.kind === "select" && !opt.choices.includes(value)) {
      throw new BadRequest(`${opt.label} must be one of ${opt.choices.join(", ")}`);
    }
    push(value);
  }
  return [...positional, ...flagged];
}

const safeName = (name: string) => path.basename(name).replace(/[^\w.#-]/g, "_");

export async function POST(request: Request) {
  const form = await request.formData();
  const script = getScript(String(form.get("script") ?? ""));
  if (!script) return Response.json({ error: "Unknown script" }, { status: 400 });

  let args: string[];
  try {
    args = buildArgs(script, form);
  } catch (err) {
    if (err instanceof BadRequest) return Response.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const file = form.get("file");
  if (script.input) {
    if (!(file instanceof File)) return Response.json({ error: "No file uploaded" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "File too large" }, { status: 413 });
  }

  const workDir = await mkdtemp(path.join(os.tmpdir(), "aga-"));
  try {
    let baseName = script.id;
    if (script.input && file instanceof File) {
      baseName = safeName(file.name) || "input.mid";
      const inputPath = path.join(/* turbopackIgnore: true */ workDir, baseName);
      await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
      args.unshift(inputPath);
    }

    const outDir = path.join(workDir, "out");
    const outputName = baseName.replace(/(\.midi?)?$/i, "_mutated.mid");
    if (script.output === "file") args.push("--output", path.join(workDir, outputName));
    if (script.output === "files") {
      await mkdir(outDir);
      args.push("--output", outDir);
    }

    const run = (cmdArgs: string[]) =>
      execFileAsync(PYTHON, cmdArgs, { cwd: workDir, timeout: 30_000 });

    let stdout: string;
    try {
      ({ stdout } = await run([path.join(SCRIPTS_DIR, script.path), ...args]));
    } catch (err) {
      const e = err as { stderr?: string; stdout?: string; message: string };
      return Response.json({ error: (e.stderr || e.stdout || e.message).trim() }, { status: 422 });
    }

    if (script.output === "text") {
      return Response.json({ log: stdout.replaceAll(workDir + path.sep, "") });
    }

    if (script.output === "file") {
      return fileResponse(await readFile(path.join(workDir, outputName)), outputName, "audio/midi");
    }

    // Multiple files: zip with Python's stdlib so there's no extra npm dependency.
    const produced = (await readdir(outDir)).sort();
    if (produced.length === 0) return Response.json({ error: "Script produced no files" }, { status: 422 });
    const zipName = `${script.id}.zip`;
    await run(["-m", "zipfile", "-c", path.join(workDir, zipName), ...produced.map((f) => path.join(outDir, f))]);
    return fileResponse(await readFile(path.join(workDir, zipName)), zipName, "application/zip", produced);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function fileResponse(data: Buffer, name: string, type: string, contents?: string[]) {
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${name}"`,
  };
  if (contents) headers["X-Zip-Contents"] = contents.join(",");
  return new Response(new Uint8Array(data), { headers });
}
