"use client";

import { chakraPetch, interExtraBold } from "@/lib/fonts";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";
import type { FeaturedMatch } from "@/lib/football";

const POLL_INTERVAL_MS = 30_000;
const GOAL_CELEBRATION_MS = 2600;
const GOLD = "#E2C988";
const DARK = "#1A1A1A";
const GRAY = "#D9D9D9";

const BAR_VIEWBOX = "0 0 552 80";
const CLOCK_VIEWBOX = "0 82 552 58";

interface GoalInfo {
  side: "home" | "away";
  team: FeaturedMatch["homeTeam"];
}

const formatClock = (utcDate: string) => {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(utcDate).getTime()) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const Crest = ({ team }: { team: FeaturedMatch["homeTeam"] }) =>
  team.crest ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={team.crest} alt={team.name} className="h-11 w-11 object-contain" />
  ) : (
    <div className="h-11 w-11 rounded-full bg-black/10" />
  );

const GoalCelebration = ({ goal }: { goal: GoalInfo }) => (
  <foreignObject x="4" y="15" width="542" height="52">
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full"
      style={{ backgroundColor: DARK }}
    >
      <motion.img
        src="/app/football.png"
        alt=""
        initial={{ scale: 1, opacity: 0 }}
        animate={{ scale: 3, opacity: 1 }}
        exit={{ scale: 1, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="absolute z-20 h-7 w-7 object-contain"
      />

      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "auto", opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }}
        className={`absolute top-0 flex h-full items-center gap-2 overflow-hidden whitespace-nowrap px-4 ${
          goal.side === "home" ? "right-1/2 flex-row-reverse" : "left-1/2"
        }`}
      >
        <Crest team={goal.team} />
        <span className={`${chakraPetch.className} text-[22px] uppercase text-white`}>{goal.team.tla}</span>
      </motion.div>

      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "auto", opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ delay: 0.3, duration: 0.45, ease: "easeOut" }}
        className={`absolute top-0 flex h-full items-center overflow-hidden whitespace-nowrap px-4 ${
          goal.side === "home" ? "left-1/2" : "right-1/2 flex-row-reverse"
        }`}
      >
        <span className={`${interExtraBold.className} text-[26px] uppercase`} style={{ color: GOLD }}>
          GOAL!
        </span>
      </motion.div>
    </div>
  </foreignObject>
);

const ScoreBar = ({ match, goal }: { match: FeaturedMatch; goal: GoalInfo | null }) => (
  <svg viewBox={BAR_VIEWBOX} className="block w-full">
    <defs>
      <filter id="fs-shadow-l" x="71" y="11" width="128" height="60" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix" />
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
        <feOffset dx="4" />
        <feGaussianBlur stdDeviation="2" />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
      </filter>
      <filter id="fs-shadow-r" x="349" y="12" width="128" height="60" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix" />
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
        <feOffset dx="-4" dy="1" />
        <feGaussianBlur stdDeviation="2" />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
      </filter>
    </defs>

    <path d="M4 15H546V42C546 55.8071 534.807 67 521 67H29C15.1929 67 4 55.8071 4 42V15Z" fill={GOLD} />

    <g filter="url(#fs-shadow-l)">
      <path d="M71 15H166C179.807 15 191 26.1929 191 40V67H71V15Z" fill={DARK} />
    </g>
    <path d="M4 15H69C82.8071 15 94 26.1929 94 40V67H29C15.1929 67 4 55.8071 4 42V15Z" fill={GRAY} />

    <g filter="url(#fs-shadow-r)">
      <path d="M357 40C357 26.1929 368.193 15 382 15H477V67H357V40Z" fill={DARK} />
    </g>
    <path d="M456 40C456 26.1929 467.193 15 481 15H546V42C546 55.8071 534.807 67 521 67H456V40Z" fill={GRAY} />

    <foreignObject x="4" y="15" width="90" height="52">
      <div className="flex h-full w-full items-center justify-center">
        <Crest team={match.homeTeam} />
      </div>
    </foreignObject>

    <foreignObject x="94" y="15" width="97" height="52">
      <div className="flex h-full w-full items-center justify-center">
        <span className={`${chakraPetch.className} text-[34px] uppercase tracking-tight text-white`}>
          {match.homeTeam.tla}
        </span>
      </div>
    </foreignObject>

    <foreignObject x="191" y="15" width="166" height="52">
      <div className="flex h-full w-full items-center justify-center gap-3">
        <span className={`${interExtraBold.className} text-[36px] leading-none tracking-tighter text-black`}>
          {match.homeScore}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/app/football.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
        <span className={`${interExtraBold.className} text-[36px] leading-none tracking-tighter text-black`}>
          {match.awayScore}
        </span>
      </div>
    </foreignObject>

    <foreignObject x="357" y="15" width="99" height="52">
      <div className="flex h-full w-full items-center justify-center">
        <span className={`${chakraPetch.className} text-[34px] uppercase tracking-tight text-white`}>
          {match.awayTeam.tla}
        </span>
      </div>
    </foreignObject>

    <foreignObject x="456" y="15" width="90" height="52">
      <div className="flex h-full w-full items-center justify-center">
        <Crest team={match.awayTeam} />
      </div>
    </foreignObject>

    <AnimatePresence>{goal && <GoalCelebration key={`${match.id}-goal`} goal={goal} />}</AnimatePresence>
  </svg>
);

const StatusPill = ({ label }: { label: string }) => (
  <svg viewBox={CLOCK_VIEWBOX} className="block w-full">
    <path
      d="M199 88H352V113C352 124.046 343.046 133 332 133H219C207.954 133 199 124.046 199 113V88Z"
      fill={GOLD}
    />
    <path
      d="M202 88H349V113C349 124.046 340.046 133 329 133H222C210.954 133 202 124.046 202 113V88Z"
      fill={DARK}
    />
    <foreignObject x="202" y="88" width="147" height="45">
      <div className="flex h-full w-full items-center justify-center">
        <span className={`${interExtraBold.className} whitespace-nowrap text-[26px] tracking-tighter text-white`}>
          {label}
        </span>
      </div>
    </foreignObject>
  </svg>
);

const FootballScore = () => {
  const [match, setMatch] = useState<FeaturedMatch | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<GoalInfo | null>(null);
  const [, forceTick] = useState(0);
  const prevRef = useRef<{ id: number; home: number; away: number } | null>(null);
  const goalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchMatch = async () => {
      try {
        const res = await fetch("/api/football-score");
        const data = await res.json();
        if (cancelled) return;
        const nextMatch: FeaturedMatch | null = data.match;

        if (nextMatch) {
          const prev = prevRef.current;
          if (prev && prev.id === nextMatch.id) {
            if (nextMatch.homeScore > prev.home) {
              setGoal({ side: "home", team: nextMatch.homeTeam });
              if (goalTimeoutRef.current) clearTimeout(goalTimeoutRef.current);
              goalTimeoutRef.current = setTimeout(() => setGoal(null), GOAL_CELEBRATION_MS);
            } else if (nextMatch.awayScore > prev.away) {
              setGoal({ side: "away", team: nextMatch.awayTeam });
              if (goalTimeoutRef.current) clearTimeout(goalTimeoutRef.current);
              goalTimeoutRef.current = setTimeout(() => setGoal(null), GOAL_CELEBRATION_MS);
            }
          }
          prevRef.current = { id: nextMatch.id, home: nextMatch.homeScore, away: nextMatch.awayScore };
        } else {
          prevRef.current = null;
        }

        setMatch(nextMatch);
        setReason(data.reason ?? null);
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMatch();
    const interval = setInterval(fetchMatch, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (goalTimeoutRef.current) clearTimeout(goalTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!match?.isLive) return;
    const tick = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, [match?.isLive]);

  if (!match) {
    return (
      <div className="my-3 flex h-14 w-full items-center justify-center rounded-full sm:h-16" style={{ backgroundColor: GOLD }}>
        <span className="text-xs font-bold uppercase tracking-widest text-black/50 sm:text-sm">
          {loading
            ? "Loading scores…"
            : reason === "missing-key"
              ? "Add FOOTBALL_DATA_API_KEY"
              : "No matches found"}
        </span>
      </div>
    );
  }

  return (
    <div className="my-3 flex w-full flex-col items-center">
      <span className={`${chakraPetch.className} mb-1 truncate text-center text-[9px] uppercase tracking-widest text-black/40 sm:text-xs`}>
        {match.isLive ? `${match.competition} · ${match.stage}` : `${match.competition} — ${match.stage}`}
      </span>

      <ScoreBar match={match} goal={goal} />

      <div className="w-[30%] min-w-[140px]">
        <StatusPill
          label={
            match.isLive ? (match.status === "PAUSED" ? "HT" : formatClock(match.utcDate)) : "FULL-TIME"
          }
        />
      </div>
    </div>
  );
};

export default FootballScore;
