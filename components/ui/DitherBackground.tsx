"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const PALETTE = ["#74d4ff", "#b8e6fe", "#e0f2fe", "#ffffff"];
const PIXEL = 3;

const BAYER_8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const draw = (canvas: HTMLCanvasElement, palette: string[], pixel: number) => {
  const COLORS = palette.map(hexToRgb);
  const width = Math.max(1, Math.ceil(canvas.clientWidth / pixel));
  const height = Math.max(1, Math.ceil(canvas.clientHeight / pixel));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const image = ctx.createImageData(width, height);
  const steps = COLORS.length - 1;
  for (let y = 0; y < height; y++) {
    const v = (y / Math.max(1, height - 1)) * steps;
    const i = Math.min(Math.floor(v), steps - 1);
    const f = v - i;
    for (let x = 0; x < width; x++) {
      const threshold = (BAYER_8[y % 8][x % 8] + 0.5) / 64;
      const [r, g, b] = COLORS[f > threshold ? i + 1 : i];
      const o = (y * width + x) * 4;
      image.data[o] = r;
      image.data[o + 1] = g;
      image.data[o + 2] = b;
      image.data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
};

const DitherBackground = ({
  className,
  palette = PALETTE,
  pixel = PIXEL,
}: {
  className?: string;
  palette?: string[];
  pixel?: number;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = palette.join();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const colors = key.split(",");
    draw(canvas, colors, pixel);
    const observer = new ResizeObserver(() => draw(canvas, colors, pixel));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [key, pixel]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none [image-rendering:pixelated]", className)}
    />
  );
};

export default DitherBackground;
