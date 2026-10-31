"use client";

import { useEffect, useRef } from "react";
import Container from "@/components/common/Container";
import SectionTitle from "@/components/common/SectionTitle";

const moods = [
  { src: "/moodboard/1.webm", width: 570, height: 520 },
  { src: "/moodboard/2.webm", width: 408, height: 406 },
  { src: "/moodboard/3.webm", width: 638, height: 391 },
  { src: "/moodboard/4.webm", width: 443, height: 475 },
  { src: "/moodboard/5.webm", width: 564, height: 328 },
  { src: "/moodboard/6.webm", width: 818, height: 454 },
  { src: "/moodboard/7.webm", width: 354, height: 379 },
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
    <div className="mb-4 break-inside-avoid sm:mb-6">
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
    </div>
  );
};

const MoodBoard = () => (
  <Container id="moods" className="flex w-full scroll-mt-8 flex-col gap-y-8 sm:gap-y-10">
    <SectionTitle bg="bg-amber-300" fill="text-amber-300">Moods</SectionTitle>
    <div className="columns-1 gap-4 sm:columns-2 sm:gap-6">
      {moods.map((mood) => (
        <MoodVideo key={mood.src} {...mood} />
      ))}
    </div>
  </Container>
);

export default MoodBoard;
