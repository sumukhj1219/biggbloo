"use client";

import { useEffect, useRef } from "react";

const FAR = 0.12;
const NEAR = 0.45;
const FEATHER = 200;
const EDGE = 3;
const SCALE = 0.25;
const FADE_MS = 350;

type Box = { left: number; top: number; width: number; height: number };

const SelectionFocus = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let boxes: Box[] = [];
    let focus = 0;
    let target = 0;
    let anim = 0;
    let readFrame = 0;
    let last = 0;

    const draw = () => {
      if (focus <= 0) {
        root.style.maskImage = "";
        return;
      }
      const w = root.clientWidth;
      const h = root.clientHeight;
      canvas.width = Math.ceil(w * SCALE);
      canvas.height = Math.ceil(h * SCALE);
      const far = 1 - focus * (1 - FAR);
      const near = 1 - focus * (1 - NEAR);
      const top = Math.min(...boxes.map((b) => b.top));
      const bottom = Math.max(...boxes.map((b) => b.top + b.height));

      ctx.globalCompositeOperation = "copy";
      for (let y = 0; y < canvas.height; y++) {
        const py = y / SCALE;
        const dist = py < top ? top - py : py > bottom ? py - bottom : 0;
        const t = Math.max(0, 1 - dist / FEATHER);
        const eased = t * t * (3 - 2 * t);
        ctx.fillStyle = `rgba(0,0,0,${far + (near - far) * eased})`;
        ctx.fillRect(0, y, canvas.width, 1);
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.filter = `blur(${EDGE * SCALE}px)`;
      ctx.fillStyle = `rgba(0,0,0,${focus})`;
      for (const b of boxes) {
        ctx.fillRect((b.left - EDGE) * SCALE, (b.top - EDGE) * SCALE, (b.width + EDGE * 2) * SCALE, (b.height + EDGE * 2) * SCALE);
      }
      ctx.filter = "none";

      root.style.maskImage = `url(${canvas.toDataURL()})`;
      root.style.maskSize = "100% 100%";
      root.style.maskRepeat = "no-repeat";
    };

    const step = (now: number) => {
      const dt = last ? now - last : 16;
      last = now;
      const delta = dt / FADE_MS;
      focus = target > focus ? Math.min(target, focus + delta) : Math.max(target, focus - delta);
      draw();
      if (focus !== target) anim = requestAnimationFrame(step);
      else last = 0;
    };
    const animateTo = (value: number) => {
      target = value;
      cancelAnimationFrame(anim);
      last = 0;
      anim = requestAnimationFrame(step);
    };

    const read = () => {
      const selection = window.getSelection();
      const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
      const active =
        !!range &&
        !selection!.isCollapsed &&
        !!selection!.toString().trim() &&
        root.contains(range.commonAncestorContainer);
      if (!active) return animateTo(0);

      const origin = root.getBoundingClientRect();
      boxes = [...range.getClientRects()]
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ left: r.left - origin.left, top: r.top - origin.top, width: r.width, height: r.height }));
      if (!boxes.length) return animateTo(0);
      if (focus === target && target === 1) draw();
      else animateTo(1);
    };

    const onSelectionChange = () => {
      cancelAnimationFrame(readFrame);
      readFrame = requestAnimationFrame(read);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      cancelAnimationFrame(anim);
      cancelAnimationFrame(readFrame);
      document.removeEventListener("selectionchange", onSelectionChange);
      root.style.maskImage = "";
    };
  }, []);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
};

export default SelectionFocus;
