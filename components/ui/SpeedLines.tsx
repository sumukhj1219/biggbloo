"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll, useVelocity } from "motion/react";

// Anime-style speed lines: tapered streaks that shoot along both sides of the
// screen while the page scrolls, more and longer the faster it moves.

type Line = { x: number; y: number; len: number; width: number; vy: number; age: number; life: number };

// Widest home content (the moodboard), so lines stay in the side margins.
const CONTENT_WIDTH = 860;
const MIN_BAND = 28;
// Scroll speed (px/s) where lines start, and where they hit full intensity.
const THRESHOLD = 250;
const FULL = 3000;
const MAX_LINES = 140;

const SpeedLines = () => {
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const wake = useRef<() => void>(() => undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lines: Line[] = [];
    let raf = 0;
    let last = 0;
    let carry = 0;
    let w = 0;
    let h = 0;
    let color = "#000";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      color = getComputedStyle(document.body).color;
    };

    const spawn = (v: number, intensity: number) => {
      const band = Math.max(MIN_BAND, (w - CONTENT_WIDTH) / 2);
      // Bias toward the outer edge, like the frame of an anime panel.
      const fromEdge = band * Math.pow(Math.random(), 1.6);
      const left = Math.random() < 0.5;
      const len = (60 + Math.random() * 220) * (0.4 + intensity);
      lines.push({
        x: left ? fromEdge : w - fromEdge,
        y: Math.random() * (h + len) - len / 2,
        len,
        width: 1.5 + Math.random() * 3 * (1 - fromEdge / band / 2),
        // Content moves up when scrolling down, so the streaks rush upward.
        vy: -Math.sign(v) * (Math.abs(v) * 0.5 + 500 + Math.random() * 400),
        age: 0,
        life: 0.25 + Math.random() * 0.3,
      });
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000 || 0, 0.05);
      last = now;
      const v = velocity.get();
      const intensity = Math.min(Math.max((Math.abs(v) - THRESHOLD) / (FULL - THRESHOLD), 0), 1);

      carry += intensity * 220 * dt;
      while (carry >= 1 && lines.length < MAX_LINES) {
        spawn(v, intensity);
        carry -= 1;
      }
      if (lines.length >= MAX_LINES) carry = 0;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      lines = lines.filter((l) => (l.age += dt) < l.life);
      for (const l of lines) {
        l.y += l.vy * dt;
        const t = l.age / l.life;
        ctx.globalAlpha = Math.sin(Math.PI * t) * 0.35;
        // Tapered wedge: full width at the head, a point at the tail.
        const dir = Math.sign(l.vy) || -1;
        const head = l.y + (dir * l.len) / 2;
        const tail = l.y - (dir * l.len) / 2;
        ctx.beginPath();
        ctx.moveTo(l.x - l.width / 2, head);
        ctx.lineTo(l.x + l.width / 2, head);
        ctx.lineTo(l.x, tail);
        ctx.closePath();
        ctx.fill();
      }

      if (lines.length || intensity > 0) raf = requestAnimationFrame(frame);
      else {
        raf = 0;
        ctx.clearRect(0, 0, w, h);
      }
    };

    // Only animate while scrolling or while lines are still fading out.
    wake.current = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
      wake.current = () => undefined;
    };
  }, [reduceMotion, velocity]);

  useMotionValueEvent(velocity, "change", (v) => {
    if (Math.abs(v) > THRESHOLD) wake.current();
  });

  if (reduceMotion) return null;
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 size-full" />;
};

export default SpeedLines;
