"use client";

import { useEffect, useRef } from "react";
import { DatamoshReveal } from "./datamosh";

export const DatamoshOverlay = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = host.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));

    const engine = new DatamoshReveal(canvas, 1 + Math.floor(Math.random() * 9999));
    if (!engine.ok) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      engine.render(0.3);
      return () => engine.destroy();
    }

    let raf = 0;
    let t0 = 0;
    let cancelled = false;
    const tick = (now: number) => {
      if (cancelled) return;
      if (!t0) t0 = now;
      engine.render((now - t0) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      engine.destroy();
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 z-30 overflow-hidden rounded-full" style={{ backgroundColor: "#1A1A1A" }}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
};
