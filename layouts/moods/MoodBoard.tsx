"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { EFFECTS, effectHref, effectName, effectVideo } from "@/lib/effects";

// Moods is a horizontal strip that scrolls on its own: swipe, trackpad or the
// arrow buttons move it sideways, while vertical scrolling passes straight
// through so the page never gets stuck on it. Cards snap to the left gutter.

// EFFECTS is in the order they were added; the board shows the newest first.
const LATEST_FIRST = [...EFFECTS].reverse();

type MoodVideoProps = (typeof EFFECTS)[number] & { root: RefObject<HTMLDivElement | null> };

const MoodVideo = ({ slug, width, height, root }: MoodVideoProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => undefined);
        else video.pause();
      },
      // Observed against the strip, so cards scrolled out sideways pause too.
      { root: root.current, rootMargin: "0px 300px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [root]);

  return (
    <Link href={effectHref(slug)} className="press group flex shrink-0 snap-start flex-col gap-y-2 [--press:0.985]">
      <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground sm:text-sm">
        {effectName(slug)}
      </span>
      <video
        ref={ref}
        src={effectVideo(slug)}
        width={width}
        height={height}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        // Capped by height, and by width so a card never outgrows the screen (2rem = mobile gutters).
        style={{ aspectRatio: `${width} / ${height}`, height: `min(52svh, 24rem, calc((100vw - 2rem) * ${height / width}))` }}
        className="block w-auto max-w-none rounded-sm"
      />
    </Link>
  );
};

const Arrow = ({ flip }: { flip?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true" style={flip ? { scale: "-1 1" } : undefined}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const arrowButton =
  "press flex size-8 cursor-pointer items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-40 disabled:hover:text-muted-foreground";

// Lines the strip up with the page column (max-w-2xl, px-4 / sm:px-6); the
// scroll padding makes cards snap to that same line.
const GUTTER = "px-4 sm:px-[max(1.5rem,calc((100vw-42rem)/2+1.5rem))]";
const SNAP_GUTTER = "scroll-pl-4 sm:scroll-pl-[max(1.5rem,calc((100vw-42rem)/2+1.5rem))]";

const MoodBoard = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<"start" | "middle" | "end">("start");

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      setEdge(track.scrollLeft <= 1 ? "start" : track.scrollLeft >= max - 1 ? "end" : "middle");
    };
    const observer = new ResizeObserver(update);
    observer.observe(track);
    track.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", update);
    };
  }, []);

  // Steps card by card: the next (or previous) card lands on the left gutter.
  const step = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const pad = parseFloat(getComputedStyle(track).paddingLeft);
    const stops = [...track.children].map((card) => (card as HTMLElement).offsetLeft - pad);
    const now = track.scrollLeft;
    const next = dir === 1 ? stops.find((x) => x > now + 1) : stops.findLast((x) => x < now - 1);
    track.scrollTo({ left: next ?? (dir === 1 ? track.scrollWidth : 0), behavior: "smooth" });
  };

  return (
    <section id="moods" aria-label="Moods" className="relative left-1/2 flex w-screen -translate-x-1/2 scroll-mt-16 flex-col gap-y-3 sm:gap-y-4">
      <div className={`flex justify-end gap-x-2 ${GUTTER}`}>
        <button type="button" onClick={() => step(-1)} disabled={edge === "start"} aria-label="Previous moods" className={arrowButton}>
          <Arrow flip />
        </button>
        <button type="button" onClick={() => step(1)} disabled={edge === "end"} aria-label="Next moods" className={arrowButton}>
          <Arrow />
        </button>
      </div>
      <div
        ref={trackRef}
        className={`relative flex snap-x snap-mandatory items-center gap-x-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] sm:gap-x-6 [&::-webkit-scrollbar]:hidden ${GUTTER} ${SNAP_GUTTER}`}
      >
        {LATEST_FIRST.map((effect) => (
          <MoodVideo key={effect.slug} {...effect} root={trackRef} />
        ))}
      </div>
    </section>
  );
};

export default MoodBoard;
