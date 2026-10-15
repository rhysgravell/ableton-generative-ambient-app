import { RunForm } from "@/components/run-form";
import { SCRIPTS } from "@/lib/scripts";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Buried Landscapes</h1>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">
        Pick a script, load a MIDI file, get a new one back.
      </p>
      <RunForm scripts={SCRIPTS} />
    </main>
  );
}
