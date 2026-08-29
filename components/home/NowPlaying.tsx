"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { NowPlayingTrack } from "@/lib/lastfm";
import { useFluidScale } from "@/hooks/useFluidScale";

const POLL_INTERVAL_MS = 30_000;
const MAX_LABEL_LENGTH = 15;
const RING_RADIUS = 17;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const truncateLabel = (text: string) =>
  text.length > MAX_LABEL_LENGTH ? `${text.slice(0, MAX_LABEL_LENGTH)}…` : text;

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

const PlayPauseButton = ({ previewUrl }: { previewUrl: string | null }) => {
  const [isPaused, setIsPaused] = useState(true);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canPlay = Boolean(previewUrl);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  return (
    <div className="absolute bottom-3 right-3 z-10 size-4 sm:size-10 flex items-center justify-center">
      {previewUrl && (
        <audio
          ref={audioRef}
          src={previewUrl}
          onPlay={() => setIsPaused(false)}
          onPause={() => setIsPaused(true)}
          onEnded={() => setIsPaused(true)}
          onTimeUpdate={(e) => {
            const audio = e.currentTarget;
            setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
          }}
        />
      )}

      {canPlay && (
        <svg className="absolute inset-0 size-4 sm:size-10 -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
          />
          <motion.circle
            cx="20"
            cy="20"
            r={RING_RADIUS}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress) }}
            transition={{ duration: 0.2, ease: "linear" }}
          />
        </svg>
      )}

      <button
        type="button"
        onClick={togglePlayback}
        disabled={!canPlay}
        aria-label={isPaused ? "Play" : "Pause"}
        className="relative flex items-center justify-center size-4 sm:size-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all disabled:opacity-40 text-primary"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isPaused ? "play" : "pause"}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center size-2 sm:size-4"
          >
            {isPaused ? <PlayIcon  /> : <PauseIcon />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
};

const NowPlaying = () => {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const scale = useFluidScale(390, 576, 1, 1.5);

  useEffect(() => {
    let cancelled = false;

    const fetchNowPlaying = async () => {
      try {
        const res = await fetch("/api/now-playing");
        const data = await res.json();
        if (cancelled) return;
        setTrack(data.track);
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const title = track?.title ?? (loading ? "Loading…" : ":(");
  const artist =
    track?.artist ?? (loading ? "" : "Connecting..");

  return (
    <div className="my-4">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          marginBottom: 150 * (scale - 1),
        }}
        className="w-[150px] h-[150px] sm:w-64 relative sm:h-48 rounded-3xl sm:rounded-3xl drop-shadow-lg sm:drop-shadow-xl drop-shadow-sky-700 shadow ring-4 sm:ring-6 ring-[#4390FE] inset-shadow-xs inset-shadow-[#232FFF] p-3 text-primary bg-[#232FFF] overflow-hidden"
      >
        <div className="absolute w-[128px] sm:w-58 h-[150px] sm:h-42 rounded-xl sm:rounded-2xl p-2 -z-10 bg-linear-to-b from-[#3a56f7] via-[#2C4BFD] to-[#232FFF] blur-xs" />

        <div className="flex flex-col absolute -z-5 items-center justify-center inset-0 mx-auto">
          <span className="text-5xl sm:text-7xl text-secondary">
            NOW
          </span>
          <span className="text-2xl sm:text-4xl italic text-secondary">
            PLAYING
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.img
            key={track?.albumImageUrl ?? "fallback"}
            layout
            src={track?.albumImageUrl ?? "/app/pepas.jpg"}
            alt={track ? `${title} album art` : "Album art"}
            className={
              "absolute rounded-lg shadow-lg ring-1 ring-white/20 object-cover z-10 " +
              (isHovered
                ? "top-11 left-1/2 -translate-x-1/2 size-16 sm:size-32"
                : "bottom-3 left-3 size-4 sm:size-8")
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.25 },
              layout: { type: "spring", stiffness: 300, damping: 28 },
            }}
          />
        </AnimatePresence>

        <div className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-0.5 px-6 z-10">
          <span
            className="text-center text-[10px] sm:text-sm font-bold text-primary truncate max-w-full"
            title={title}
          >
            {truncateLabel(title)}
          </span>
          {artist && (
            <span
              className="text-center text-[8px] sm:text-xs text-secondary/80 truncate max-w-full"
              title={artist}
            >
              {truncateLabel(artist)}
            </span>
          )}
        </div>

        <PlayPauseButton key={track?.previewUrl ?? "none"} previewUrl={track?.previewUrl ?? null} />
      </div>
    </div>
  );
};

export default NowPlaying;
