"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { pageItem } from "@/lib/motion";
import type { MoodboardItem } from "./moodboardItems";

interface MoodboardCardProps {
  item: MoodboardItem;
}

function usePlayWhenVisible(ref: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin: "150px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

const MoodboardCard = ({ item }: MoodboardCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  usePlayWhenVisible(videoRef);

  return (
    <motion.figure
      variants={pageItem}
      style={{ aspectRatio: item.ratio }}
      className="mb-2 break-inside-avoid overflow-hidden rounded-md"
    >
      {item.type === "video" ? (
        <video
          ref={videoRef}
          src={item.src}
          muted
          loop
          playsInline
          className="block h-full w-full object-cover"
        />
      ) : (
        <img
          src={item.src}
          alt={item.alt}
          className="block h-full w-full object-cover"
        />
      )}

      {item.caption && (
        <figcaption className="bg-black/40 px-3 py-2 text-xs text-primary sm:text-sm">
          {item.caption}
        </figcaption>
      )}
    </motion.figure>
  );
};

export default MoodboardCard;
