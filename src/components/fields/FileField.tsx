"use client";

import { useState } from "react";
import { cx } from "../ui";

export type LoadedFile = { file: File; name: string; meta: string; bad: boolean };

const ACCEPT = ".mid,.midi,audio/midi";

export function FileField({
  file,
  error,
  onFile,
  onSample,
  onRemove,
}: {
  file: LoadedFile | null;
  error?: boolean;
  onFile: (f: File) => void;
  onSample: () => void;
  onRemove: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(true);
    },
    onDragLeave: () => setDrag(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
  };
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = "";
  };

  if (!file) {
    return (
      <>
        <label
          {...dropProps}
          className={cx(
            "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed p-5 text-center transition-[background,border-color] duration-200",
            drag ? "border-accent bg-accent-soft" : error ? "border-err bg-err-soft" : "border-line",
          )}
        >
          <input type="file" accept={ACCEPT} onChange={pick} className="sr-only" />
          <span className="font-serif text-[21px] font-light italic leading-[1.1] text-text">Drop a MIDI file here</span>
          <span className="font-sans text-[13px] text-text-3">
            or <span className="text-accent underline underline-offset-[3px]">browse</span> · .mid or .midi
          </span>
        </label>
        <button
          type="button"
          onClick={onSample}
          className="cursor-pointer self-start font-sans text-[12.5px] text-text-3 underline underline-offset-[3px] hover:text-text-2"
        >
          No file handy? Use a sample loop
        </button>
      </>
    );
  }

  const ext = (file.name.split(".").pop() ?? "?").toUpperCase().slice(0, 4);
  return (
    <div
      {...dropProps}
      className={cx(
        "flex min-h-[66px] items-center gap-3 rounded-[14px] border py-2.5 pl-2.5 pr-2",
        drag ? "border-accent bg-accent-soft" : "bg-raised",
        error ? "border-err ring-err" : !drag && "border-line",
      )}
    >
      <span
        className={cx(
          "flex size-11 flex-none items-center justify-center rounded-[10px] font-mono text-[10px] font-medium tracking-[0.06em]",
          error ? "bg-err-soft text-err" : "bg-accent-soft text-accent",
        )}
      >
        {file.bad ? ext : "MIDI"}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-mono text-[13.5px] font-medium leading-[1.2] text-text">{file.name}</span>
        <span className="font-sans text-xs leading-[1.2] text-text-3">{file.meta}</span>
      </span>
      <label className="cursor-pointer rounded-lg px-2.5 py-2 font-sans text-[12.5px] font-medium text-text-2 hover:bg-hover hover:text-text">
        Replace
        <input type="file" accept={ACCEPT} onChange={pick} className="sr-only" />
      </label>
      <button
        type="button"
        aria-label="Remove file"
        onClick={onRemove}
        className="flex size-8 cursor-pointer items-center justify-center rounded-lg font-sans text-base text-text-3 hover:bg-hover hover:text-text"
      >
        ×
      </button>
    </div>
  );
}
