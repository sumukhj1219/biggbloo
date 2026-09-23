"use client";

import React, { forwardRef, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { animate, motion, useMotionValue } from "motion/react";
import type { NowPlayingTrack } from "@/lib/lastfm";
import { cn } from "@/lib/utils";
import { DotmSquare1 } from "@/components/ui/dotm-square-1";

const POLL_INTERVAL_MS = 30_000;
const MAX_TITLE_LENGTH = 10;
const FALLBACK_IMAGE = "/app/pepas.jpeg";

const truncateTitle = (title: string) =>
  title.length > MAX_TITLE_LENGTH
    ? `${title.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`
    : title;

const useNowPlaying = () => {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/now-playing");
        const data = await res.json();
        if (cancelled) return;
        const next: NowPlayingTrack | null = data.track ?? null;
        setTrack((prev) =>
          prev && next && prev.title === next.title && prev.artist === next.artist
            ? { ...next, previewUrl: prev.previewUrl ?? next.previewUrl }
            : next
        );
      } catch {
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { track, loaded };
};

const Disc = ({ track }: { track: NowPlayingTrack | null }) => {
  const previewUrl = track?.previewUrl ?? null;
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rotate = useMotionValue(0);

  useEffect(() => {
    if (!isPlaying) return;
    const controls = animate(rotate, rotate.get() + 360, {
      duration: 6,
      ease: "linear",
      repeat: Infinity,
    });
    return () => controls.stop();
  }, [isPlaying, rotate]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {
        if (audio.paused) setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  };

  return (
    <motion.span
      initial="rest"
      animate={isPlaying ? "raised" : "rest"}
      whileHover="raised"
      className="group rounded-sm relative size-12 p-1 bg-secondary overflow-hidden "
    >
      <motion.span
        variants={{ rest: { y: 0 }, raised: { y: -24 } }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="absolute z-10 size-10"
      >
        <motion.span
          className="absolute inset-0 bg-primary/80 rounded-full overflow-hidden"
          style={{ rotate }}
        >
          <Image
            src={track?.albumImageUrl ?? FALLBACK_IMAGE}
            alt={track ? `${track.album} cover` : ""}
            fill
            sizes="40px"
            className="object-cover"
          />
        </motion.span>
        <span className="absolute bg-secondary border ring ring-offset-2 ring-muted-foreground left-3 top-3 rounded-full z-20 size-4"></span>
      </motion.span>
      {previewUrl && (
        <>
          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
            className={cn(
              "absolute bottom-0.5 left-1/2 z-30 flex size-3.5 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-muted-foreground text-background transition-opacity",
              "opacity-0 group-hover:opacity-100"
            )}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-2.5">
              {isPlaying ? (
                <>
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </>
              ) : (
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              )}
            </svg>
          </button>
          <audio
            ref={audioRef}
            src={previewUrl}
            preload="none"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </>
      )}
    </motion.span>
  );
};

const MusicPlayer = forwardRef<HTMLDivElement>((_props, ref) => {
  const { track, loaded } = useNowPlaying();

  return (
    <div ref={ref} className="flex gap-x-3 items-center">
      <Disc key={`${track?.title}|${track?.artist}`} track={track} />
      <div className="flex min-w-0 flex-col text-muted-foreground/60 text-sm ">
        <span>{track?.isPlaying ? "Now Playing" : "Last Played"}</span>
        {track ? (
          <span className="break-words">
            <span title={track.title}>{truncateTitle(track.title)}</span> by{" "}
            {track.artist}
          </span>
        ) : loaded ? (
          <span>Nothing to show</span>
        ) : (
          <span className="flex items-center gap-x-2">
            <DotmSquare1 size={10} dotSize={1} ariaLabel="Loading" bloom />
            Fetching
          </span>
        )}
      </div>
    </div>
  );
});
MusicPlayer.displayName = "MusicPlayer";

export default MusicPlayer;
