"use client";

import { useEffect, useRef } from "react";
import { interExtraBold } from "@/lib/fonts";
import { GoalPop } from "./engine";
import { SCENE_H, SCENE_W } from "./params";
import { SwingReveal } from "./swing";

const PHASE1_END_MS = 2200;
const PHASE2_DURATION_MS = 1000;
export const PHASE2_END_MS = PHASE1_END_MS + PHASE2_DURATION_MS;

const DATAMOSH_DURATION_MS = 1000;

// The full-width datamosh exit overlay (DatamoshOverlay.tsx) runs from
// PHASE2_END_MS for DATAMOSH_DURATION_MS, mounted separately by GoalCelebration
// so it can span the whole pill instead of this small centred canvas.
export const DATAMOSH_START_MS = PHASE2_END_MS;
export const GOAL_CELEBRATION_MS = PHASE2_END_MS + DATAMOSH_DURATION_MS;

export const GoalPopCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const family = interExtraBold.style.fontFamily;
    const pop = new GoalPop(canvas, family);
    const swing = new SwingReveal(canvas, SCENE_W, SCENE_H, family);
    if (!pop.ok || !swing.ok) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      pop.render(0);
      document.fonts?.ready?.then(() => {
        pop.refreshFont();
        pop.render(0);
      });
      return () => {
        pop.destroy();
        swing.destroy();
      };
    }

    document.fonts?.ready?.then(() => {
      pop.refreshFont();
      swing.refreshFont();
    });

    let raf = 0;
    let t0 = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      if (!t0) t0 = now;
      const elapsed = now - t0;

      if (elapsed < PHASE1_END_MS) {
        pop.renderStepped(elapsed);
      } else if (elapsed < PHASE2_END_MS) {
        swing.render((elapsed - PHASE1_END_MS) / 1000);
      } else {
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      pop.destroy();
      swing.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="GOAL"
      style={{ width: SCENE_W, height: SCENE_H }}
    />
  );
};
