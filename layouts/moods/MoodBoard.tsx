"use client";

import { useEffect, useRef } from "react";
import Container from "@/components/common/Container";
import SectionTitle from "@/components/common/SectionTitle";

const moods = [
  { src: "/moodboard/1.webm", width: 570, height: 520 },
  { src: "/moodboard/2.webm", width: 1648, height: 767 },
];

const MoodVideo = ({ src, width, height }: (typeof moods)[number]) => {
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
    <div className="relative mb-3 break-inside-avoid overflow-hidden border-2 bg-secondary inset-shadow-xs sm:mb-4">
      <video
        ref={ref}
        src={src}
        width={width}
        height={height}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        className="block h-auto w-full"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_32px_0px_var(--color-background)]"
      />
    </div>
  );
};

const MoodBoard = () => (
  <Container id="moods" className="flex w-full scroll-mt-8 flex-col gap-y-8 sm:gap-y-10">
    <SectionTitle bg="bg-amber-300" fill="text-amber-300">Moods</SectionTitle>
    <div className="columns-1 gap-3 sm:columns-2 sm:gap-4">
      {moods.map((mood) => (
        <MoodVideo key={mood.src} {...mood} />
      ))}
    </div>
  </Container>
);

export default MoodBoard;
