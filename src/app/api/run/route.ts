import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getScript } from "@/lib/scripts";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const SCRIPTS_REPO =
  process.env.SCRIPTS_REPO_PATH ?? path.resolve(process.cwd(), "../ableton-generative-ambient");
const PYTHON = process.env.PYTHON_BIN ?? "python3";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const script = getScript(String(form.get("script") ?? ""));
  if (!script) return Response.json({ error: "Unknown script" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "File too large" }, { status: 413 });

  const args: string[] = [];
  for (const opt of script.options) {
    const value = form.get(opt.name);
    if (opt.kind === "boolean") {
      if (value === "on" || value === "true") args.push(opt.flag);
    } else if (typeof value === "string" && value.trim() !== "") {
      if (!Number.isFinite(Number(value))) {
        return Response.json({ error: `${opt.label} must be a number` }, { status: 400 });
      }
      args.push(opt.flag, value.trim());
    }
  }

  const workDir = await mkdtemp(path.join(os.tmpdir(), "aga-"));
  try {
    const baseName = path.basename(file.name).replace(/[^\w.-]/g, "_") || "input.mid";
    const inputPath = path.join(workDir, baseName);
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    const outputName = baseName.replace(/(\.midi?)?$/i, "_mutated.mid");
    const outputPath = path.join(workDir, outputName);
    if (script.output === "file") args.push("--output", outputPath);

    let stdout: string;
    try {
      ({ stdout } = await execFileAsync(PYTHON, [path.join(SCRIPTS_REPO, script.path), inputPath, ...args], {
        cwd: workDir,
        timeout: 30_000,
      }));
    } catch (err) {
      const e = err as { stderr?: string; stdout?: string; message: string };
      return Response.json({ error: (e.stderr || e.stdout || e.message).trim() }, { status: 422 });
    }

    if (script.output === "text") {
      return Response.json({ log: stdout.replaceAll(workDir + path.sep, "") });
    }

    const data = await readFile(outputPath);
    return new Response(data, {
      headers: {
        "Content-Type": "audio/midi",
        "Content-Disposition": `attachment; filename="${outputName}"`,
      },
    });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
