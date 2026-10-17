"use client";

import { useEffect, useRef, useState } from "react";
import { reportText, type Report as ReportData, type Section } from "@/lib/reports";
import { cx } from "../ui";

function TableSection({ sec }: { sec: Extract<Section, { type: "table" }> }) {
  const align = (i: number) => (sec.align[i] === "r" ? "text-right" : "text-left");
  return (
    <div className="-mx-2.5 overflow-x-auto px-2.5">
      <div role="table" className="flex min-w-[320px] flex-col">
        <div role="row" className="grid gap-3.5 border-b border-line pb-[9px]" style={{ gridTemplateColumns: sec.cols }}>
          {sec.head.map((h, i) => (
            <span key={h} role="columnheader" className={cx("font-mono text-[10.5px] font-medium uppercase leading-none tracking-[0.1em] text-text-3", align(i))}>
              {h}
            </span>
          ))}
        </div>
        {sec.rows.map((row, ri) => {
          const on = ri === sec.highlight;
          return (
            <div
              key={ri}
              role="row"
              className={cx(
                "grid items-baseline gap-3.5",
                on ? "-mx-2.5 rounded-lg border-b border-transparent bg-accent-soft p-2.5" : "border-b border-line-soft py-2.5",
              )}
              style={{ gridTemplateColumns: sec.cols }}
            >
              {row.map((c, i) => (
                <span
                  key={i}
                  role="cell"
                  className={cx(
                    "truncate whitespace-nowrap font-mono text-[13.5px] leading-[1.3]",
                    i === 0 ? "font-medium" : "font-normal",
                    on && i === 0 ? "text-accent" : i === 0 ? "text-text-2" : "text-text",
                    align(i),
                  )}
                >
                  {c}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionBody({ sec }: { sec: Section }) {
  switch (sec.type) {
    case "head":
      return (
        <div className="flex flex-col gap-2">
          <div className="font-serif text-[46px] font-light leading-[1.02] tracking-[-0.01em] text-text">{sec.big}</div>
          {sec.cap && <div className="whitespace-pre-wrap font-mono text-[13px] leading-normal text-text-2 [word-spacing:0.25em]">{sec.cap}</div>}
        </div>
      );
    case "kv":
      return (
        <dl className="flex flex-col">
          {sec.rows.map((r) => (
            <div key={r.k} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-baseline gap-4 border-b border-dashed border-line-soft py-2.5">
              <dt className="font-sans text-[13px] text-text-2">{r.k}</dt>
              <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-sm font-medium text-text">{r.v}</span>
                {r.n && <span className="font-sans text-[12.5px] text-text-3">{r.n}</span>}
              </dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return <TableSection sec={sec} />;
    case "bars": {
      const max = Math.max(1, ...sec.bars.map((b) => b.count));
      return (
        <div className="flex flex-col gap-0.5">
          {sec.bars.map((b) => (
            <div key={b.label} className="grid h-6 grid-cols-[2.4rem_minmax(0,1fr)_2.2rem] items-center gap-3">
              <span className="font-mono text-[13px] font-medium text-text-2">{b.label}</span>
              <span className="relative h-1.5 overflow-hidden rounded-md bg-line-soft">
                {b.count > 0 && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-md bg-accent"
                    style={{ width: `${(b.count / max) * 100}%`, opacity: 0.35 + (0.65 * b.count) / max }}
                  />
                )}
              </span>
              <span className="text-right font-mono text-[12.5px] text-text-3">{b.count}</span>
            </div>
          ))}
        </div>
      );
    }
  }
}

export function Report({ report }: { report: ReportData }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportText(report));
    } catch {
      // Clipboard blocked; still confirm so the button doesn't feel dead.
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-[30px]">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="font-serif text-[32px] font-light leading-[1.05] text-text">{report.title}</h2>
          <div className="break-all font-sans text-[13px] leading-[1.4] text-text-3">{report.sub}</div>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex h-[38px] cursor-pointer items-center rounded-[10px] border border-line px-3.5 font-sans text-[13px] font-medium text-text-2 hover:bg-hover hover:text-text"
        >
          {copied ? "Copied" : "Copy as text"}
        </button>
      </div>
      {report.sections.map((sec) => (
        <section key={sec.title} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h3 className="caps whitespace-nowrap">{sec.title}</h3>
            <span className="h-px flex-1 bg-line-soft" />
            {sec.note && <span className="font-sans text-xs text-text-3">{sec.note}</span>}
          </div>
          <SectionBody sec={sec} />
        </section>
      ))}
    </div>
  );
}
