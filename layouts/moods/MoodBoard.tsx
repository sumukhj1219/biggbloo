"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import Container from "@/components/common/Container";
import SectionTitle from "@/components/common/SectionTitle";
import { EFFECTS, effectHref, effectName, effectVideo } from "@/lib/effects";

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
      { rootMargin: "200px 0px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    // From md up each card grows in proportion to its aspect ratio, so both
    // cards in a row share one height and fill the width edge to edge.
    <Link
      href={effectHref(slug)}
      style={{ "--ar": width / height } as CSSProperties}
      className="group flex flex-col gap-y-2 md:[flex:var(--ar)_1_0%]"
    >
      <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
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
        className="block h-auto w-full rounded-sm"
      />
    </Link>
  );
};

const ROWS = Array.from({ length: Math.ceil(EFFECTS.length / 2) }, (_, i) => EFFECTS.slice(i * 2, i * 2 + 2));

const MoodBoard = () => (
  <Container id="moods" className="flex w-full scroll-mt-8 flex-col gap-y-8 sm:gap-y-10">
    <SectionTitle bg="bg-amber-300" fill="text-amber-300">Moods</SectionTitle>
    {/* Mobile stacks inside the page column; md+ widens past it (up to 52rem), two per row. */}
    <div className="flex flex-col gap-y-8 md:relative md:left-1/2 md:w-[min(100vw,52rem)] md:-translate-x-1/2 md:gap-y-10 md:px-6 lg:px-10">
      {ROWS.map((row) => (
        <div key={row[0].slug} className="flex flex-col gap-y-8 md:flex-row md:gap-x-6">
          {row.map((effect) => (
            <MoodVideo key={effect.slug} {...effect} />
          ))}
          {/* A lone last card gets an invisible partner so it keeps a half-row size. */}
          {row.length === 1 && <div aria-hidden="true" className="hidden md:block md:[flex:1.2_1_0%]" />}
        </div>
      ))}
    </div>
  </Container>
);

export default MoodBoard;
