"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useLenis } from "lenis/react";
import { EFFECTS, effectHref, effectName, effectVideo } from "@/lib/effects";

// Moods is a horizontal track that pins in the middle of the screen: scrolling
// down through the section slides it sideways (one pixel of scroll moves it one
// pixel), and the arrow buttons step through it by scrolling the page for you.
// The section is only as tall as the track plus that sideways distance, so it
// adds no empty space above or below.

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
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // start: page scroll where pinning begins; top: sticky offset that centres the track.
  const [geo, setGeo] = useState({ start: 0, distance: 0, height: 0, top: 0 });
  const [edge, setEdge] = useState<"start" | "middle" | "end">("start");
  const lenis = useLenis();
  const { scrollY } = useScroll();

  const offset = (y: number) => Math.min(Math.max(y - geo.start, 0), geo.distance);
  const x = useTransform(scrollY, (y) => -offset(y));

  useMotionValueEvent(scrollY, "change", (y) => {
    const o = offset(y);
    setEdge(o <= 1 ? "start" : o >= geo.distance - 1 ? "end" : "middle");
  });

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!section || !pin || !track) return;
    const measure = () => {
      const height = pin.offsetHeight;
      const top = Math.max((window.innerHeight - height) / 2, 0);
      setGeo({
        start: section.getBoundingClientRect().top + window.scrollY - top,
        distance: Math.max(track.scrollWidth - pin.clientWidth, 0),
        height,
        top,
      });
    };
    // The body is observed too: anything above changing height moves the start.
    const observer = new ResizeObserver(measure);
    [track, pin, document.body].forEach((el) => observer.observe(el));
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const pin = pinRef.current;
    if (!pin) return;
    const target = geo.start + offset(window.scrollY + dir * pin.clientWidth * 0.6);
    if (lenis) lenis.scrollTo(target, { duration: 0.9 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      id="moods"
      aria-label="Moods"
      className="relative left-1/2 w-screen -translate-x-1/2"
      // Lands /#moods with the track already centred.
      style={{ height: geo.height + geo.distance || undefined, scrollMarginTop: geo.top }}
    >
      <div ref={pinRef} className="sticky flex flex-col gap-y-3 overflow-hidden sm:gap-y-4" style={{ top: geo.top }}>
        <div className={`flex justify-end gap-x-2 ${GUTTER}`}>
          <button type="button" onClick={() => step(-1)} disabled={edge === "start"} aria-label="Previous moods" className={arrowButton}>
            <Arrow flip />
          </button>
          <button type="button" onClick={() => step(1)} disabled={edge === "end"} aria-label="Next moods" className={arrowButton}>
            <Arrow />
          </button>
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
