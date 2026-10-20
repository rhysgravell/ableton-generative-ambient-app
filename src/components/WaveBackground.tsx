"use client";

import { useEffect, useRef } from "react";

/** a: amplitude (fraction of H), k: cycles across width, s: speed, y: centre (fraction of H), al: alpha, w: line width. */
const WAVES = [
  { a: 0.24, k: 1.1, s: 0.07, y: 0.6, al: 0.6, w: 1.6 },
  { a: 0.17, k: 1.7, s: -0.05, y: 0.63, al: 0.4, w: 1.3 },
  { a: 0.3, k: 0.7, s: 0.035, y: 0.66, al: 0.32, w: 1.1 },
  { a: 0.12, k: 2.6, s: 0.09, y: 0.57, al: 0.26, w: 1 },
  { a: 0.2, k: 1.35, s: -0.025, y: 0.7, al: 0.2, w: 1 },
];

const TAU = Math.PI * 2;

/** Slow animated sine waves drawn behind the welcome hero; one static frame under reduced motion. */
export function WaveBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let W = 0;
    let H = 0;
    let raf = 0;
    const start = performance.now();

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      // Read every frame so a theme switch applies immediately.
      ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--wave").trim();
      WAVES.forEach(({ a, k, s, y: y0, al, w }, i) => {
        const breathe = 0.75 + 0.25 * Math.sin(t * 0.18 + i * 1.3);
        ctx.globalAlpha = al;
        ctx.lineWidth = w;
        ctx.beginPath();
        for (let x = 0; x <= W + 4; x += 4) {
          const u = x / W;
          const y =
            H * y0 +
            Math.sin(u * TAU * k + t * s * TAU + i) * H * a * breathe +
            Math.sin(u * TAU * k * 2.3 - t * s * 3 + i * 2) * H * a * 0.18;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(0);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (!reduced) {
      const loop = (now: number) => {
        draw((now - start) / 1000);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
