"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useLenis } from "lenis/react";
import SectionTitle from "@/components/common/SectionTitle";
import { EFFECTS, effectHref, effectName, effectVideo } from "@/lib/effects";

// Moods is a horizontal track pinned to the screen: scrolling down through the
// section slides it sideways (one pixel of scroll moves it one pixel), and the
// arrow buttons step through it by scrolling the page for you.

const MoodVideo = ({ slug, width, height }: (typeof EFFECTS)[number]) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => undefined);
        else video.pause();
      },
      { rootMargin: "0px 300px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <Link href={effectHref(slug)} className="press group flex shrink-0 flex-col gap-y-2 [--press:0.985]">
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
        style={{ aspectRatio: `${width} / ${height}` }}
        className="block h-[min(52svh,24rem)] w-auto max-w-none rounded-sm"
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

// Lines the track up with the page column (max-w-2xl, px-4 / sm:px-6).
const GUTTER = "px-4 sm:px-[max(1.5rem,calc((100vw-42rem)/2+1.5rem))]";

const MoodBoard = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [edge, setEdge] = useState<"start" | "middle" | "end">("start");
  const lenis = useLenis();

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, (p) => -p * distance);

  useMotionValueEvent(scrollYProgress, "change", (p) => setEdge(p <= 0.001 ? "start" : p >= 0.999 ? "end" : "middle"));

  // How far the track overflows the screen: that's how much extra scroll the section needs.
  useLayoutEffect(() => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;
    const measure = () => setDistance(Math.max(track.scrollWidth - viewport.clientWidth, 0));
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(viewport);
    measure();
    return () => observer.disconnect();
  }, []);

  const step = (dir: 1 | -1) => {
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    if (!section || !viewport) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const offset = Math.min(Math.max(window.scrollY - top + dir * viewport.clientWidth * 0.6, 0), distance);
    if (lenis) lenis.scrollTo(top + offset, { duration: 0.9 });
    else window.scrollTo({ top: top + offset, behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      id="moods"
      aria-labelledby="moods-title"
      className="relative left-1/2 w-screen -translate-x-1/2"
      style={{ height: `calc(100svh + ${distance}px)` }}
    >
      <div ref={viewportRef} className="sticky top-0 flex h-svh flex-col justify-center gap-y-4 overflow-hidden sm:gap-y-6">
        <div className={`flex items-center justify-between ${GUTTER}`}>
          <SectionTitle>
            <span id="moods-title">Moods</span>
          </SectionTitle>
          <div className="flex gap-x-2">
            <button type="button" onClick={() => step(-1)} disabled={edge === "start"} aria-label="Previous moods" className={arrowButton}>
              <Arrow flip />
            </button>
            <button type="button" onClick={() => step(1)} disabled={edge === "end"} aria-label="Next moods" className={arrowButton}>
              <Arrow />
            </button>
          </div>
        </div>
        <motion.div ref={trackRef} style={{ x }} className={`flex w-max items-end gap-x-4 sm:gap-x-6 ${GUTTER}`}>
          {EFFECTS.map((effect) => (
            <MoodVideo key={effect.slug} {...effect} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default MoodBoard;
