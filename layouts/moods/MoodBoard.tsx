"use client";

import { useEffect, useRef } from "react";
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
    <Link href={effectHref(slug)} aria-label={effectName(slug)} className="mb-4 block break-inside-avoid sm:mb-6">
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
        className="block h-auto w-full"
      />
    </Link>
  );
};

const MoodBoard = () => (
  <Container id="moods" className="flex w-full scroll-mt-8 flex-col gap-y-8 sm:gap-y-10">
    <SectionTitle bg="bg-amber-300" fill="text-amber-300">Moods</SectionTitle>
    <div className="columns-1 gap-4 sm:columns-2 sm:gap-6">
      {EFFECTS.map((effect) => (
        <MoodVideo key={effect.slug} {...effect} />
      ))}
    </div>
  </Container>
);

export default MoodBoard;
