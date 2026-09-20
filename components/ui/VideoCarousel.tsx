"use client";

import React, { useEffect, useRef, useState } from "react";

export interface CarouselVideo {
  id: number | string;
  src: string;
  title?: string;
  poster?: string;
}

const FEATHER_PX = 32;
const FEATHER_STEPS = 10;
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const fade = (axis: "right" | "bottom") => {
  const start: string[] = [];
  const end: string[] = [];
  for (let i = 0; i <= FEATHER_STEPS; i++) {
    const t = i / FEATHER_STEPS;
    const alpha = smoothstep(t).toFixed(3);
    start.push(`rgba(0,0,0,${alpha}) ${(t * FEATHER_PX).toFixed(1)}px`);
    end.unshift(
      `rgba(0,0,0,${alpha}) calc(100% - ${(t * FEATHER_PX).toFixed(1)}px)`,
    );
  }
  return `linear-gradient(to ${axis}, ${[...start, ...end].join(", ")})`;
};
const FEATHER = `${fade("right")}, ${fade("bottom")}`;
const FEATHER_STYLE: React.CSSProperties = {
  maskImage: FEATHER,
  WebkitMaskImage: FEATHER,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

const Chevron = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden
  >
    <path d={direction === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
  </svg>
);

const NavButton = ({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={direction === "left" ? "Previous video" : "Next video"}
    className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-accent"
  >
    <Chevron direction={direction} />
  </button>
);

const VideoCarousel = ({ videos }: { videos: CarouselVideo[] }) => {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const count = videos.length;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => undefined);
  }, [index]);

  useEffect(() => {
    if (!ready || count < 2) return;
    const urls = [
      videos[(index + 1) % count].src,
      videos[(index - 1 + count) % count].src,
    ];
    const warmers = urls.map((src) => {
      const el = document.createElement("video");
      el.preload = "auto";
      el.muted = true;
      el.src = src;
      return el;
    });
    return () => {
      warmers.forEach((el) => {
        el.removeAttribute("src");
        el.load();
      });
    };
  }, [ready, index, count, videos]);

  if (count === 0) return null;

  const current = videos[index];
  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  return (
    <div className="flex w-full flex-col gap-y-2">
      <div
        className="relative aspect-video w-full overflow-hidden"
        style={FEATHER_STYLE}
      >
        <video
          ref={videoRef}
          src={current.src}
          poster={current.poster}
          className="h-full w-full object-cover"
          autoPlay
          preload="auto"
          onLoadStart={() => setReady(false)}
          onCanPlayThrough={() => setReady(true)}
          muted
          loop
          playsInline
          aria-label={current.title ?? `Experiment ${index + 1}`}
        />
      </div>
      <div className="flex items-center justify-between gap-x-3 text-sm text-muted-foreground">
        {count > 1 ? (
          <div className="flex items-center gap-x-2">
            <NavButton direction="left" onClick={() => go(-1)} />
            <NavButton direction="right" onClick={() => go(1)} />
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-x-3">
          {current.title && <span>{current.title}</span>}
          <span className="tabular-nums">
            {index + 1} / {count}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoCarousel;
