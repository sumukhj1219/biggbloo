"use client";

import { useEffect, useRef } from "react";
import { ShutterType } from "./engine";
import { FONT_VAR, FONT_WEIGHT, SKY } from "./params";

// `accent` is the ink the GOAL text flashes in between its paper-coloured beats.
export function GoalShutter({ accent = SKY }: { accent?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let engine: ShutterType | null = null;

    const raf = requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const probe = document.createElement("span");
      probe.style.cssText = `position:absolute;visibility:hidden;font-family:var(${FONT_VAR})`;
      probe.textContent = "Ag";
      document.body.appendChild(probe);
      const fam = getComputedStyle(probe).fontFamily || "sans-serif";
      document.body.removeChild(probe);

      engine = new ShutterType(canvas, fam, accent);
      if (!engine.ok) return;
      if (reduced) engine.renderStill();
      else engine.start();

      if (document.fonts?.load) {
        const first = fam.split(",")[0].replace(/["']/g, "").trim();
        document.fonts
          .load(`${FONT_WEIGHT} 1em "${first}"`)
          .then(() => engine?.refreshFont(), () => {});
      }
    });

    let rt = 0;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => engine?.resize(), 120);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(rt);
      engine?.destroy();
      engine = null;
    };
  }, [accent]);

  return (
    <div aria-hidden className="relative aspect-video w-full overflow-hidden">
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
