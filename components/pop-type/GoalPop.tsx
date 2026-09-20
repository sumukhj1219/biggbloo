"use client";

import { useEffect, useRef } from "react";
import { PopType } from "./engine";
import { FONT_VAR, FONT_WEIGHT } from "./params";

const STILL_HOLD_MS = 1200;
// Ink height in CSS px of the letters, sized for a 56px-tall team row.
const CAP_PX = 26;

/**
 * Paper overlay that plays the "GOAL" drop-and-pop once each time `trigger`
 * changes. Fills its (relatively positioned) parent and is invisible when idle.
 */
export function GoalPop({ trigger }: { trigger: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PopType | null>(null);
  const runRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;

    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;visibility:hidden;font-family:var(${FONT_VAR})`;
    probe.textContent = "Ag";
    document.body.appendChild(probe);
    const family = getComputedStyle(probe).fontFamily || "sans-serif";
    probe.remove();

    engineRef.current = new PopType(canvas, family, { capPx: CAP_PX });

    // Re-measure the letters once the webfont has actually loaded.
    const first = family.split(",")[0].replace(/["']/g, "").trim();
    document.fonts
      ?.load(`${FONT_WEIGHT} 1em "${first}"`)
      .then(() => {
        if (!disposed) engineRef.current?.refreshFont();
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (trigger === 0) return;
    const engine = engineRef.current;
    const wrap = wrapRef.current;
    if (!engine || !engine.ok || !wrap || engine.isPlaying) return;

    const show = () => {
      wrap.style.opacity = "1";
    };
    const hide = () => {
      wrap.style.opacity = "0";
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      engine.renderStill();
      show();
      const t = window.setTimeout(hide, STILL_HOLD_MS);
      return () => window.clearTimeout(t);
    }

    show();
    engine.playOnce(runRef.current++, hide);
  }, [trigger]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-sm bg-white opacity-0 transition-opacity duration-100"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
