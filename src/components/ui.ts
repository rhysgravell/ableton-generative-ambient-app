// Shared class recipes from the handoff's component specs.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Control box for select, number and text inputs: 46px, radius 11. */
export const boxClass = (err?: boolean) =>
  cx(
    "control relative flex h-[46px] items-center overflow-hidden rounded-[11px] border bg-raised",
    err ? "border-err ring-err" : "border-line",
  );

/** 18px checkbox square; accent fill with a ✓ when on. */
export const checkClass = (on: boolean) =>
  cx(
    "flex size-[18px] flex-none items-center justify-center rounded-[5px] border font-sans text-[11px] font-semibold text-accent-ink",
    on ? "border-accent bg-accent" : "border-line bg-transparent",
  );

/** Selectable card: CheckCard, preset chips. */
export const choiceClass = (on: boolean, err?: boolean) =>
  cx(
    "cursor-pointer border text-left",
    err ? "border-err" : on ? "border-accent-line" : "border-line-soft",
    on ? "bg-accent-soft" : "bg-raised",
  );

export const inputReset = "w-full min-w-0 border-0 bg-transparent text-text outline-none";

/** Primary accent button (Download). */
export const primaryButton =
  "flex h-11 flex-none items-center gap-2.5 rounded-[11px] bg-accent px-[18px] font-sans text-sm font-semibold text-accent-ink hover:brightness-[1.07]";
