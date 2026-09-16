"use client";

import { chakraPetch, interExtraBold } from "@/lib/fonts";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";
import type { FeaturedMatch } from "@/lib/football";
import { DatamoshOverlay } from "./goal-pop/DatamoshOverlay";
import { DATAMOSH_START_MS, GOAL_CELEBRATION_MS, GoalPopCanvas } from "./goal-pop/GoalPopCanvas";

const POLL_INTERVAL_MS = 30_000;
const GOLD = "#E2C988";
const DARK = "#1A1A1A";
const GRAY = "#D9D9D9";

const BAR_VIEWBOX = "0 0 552 80";
const CLOCK_VIEWBOX = "0 82 552 58";

interface GoalInfo {
  side: "home" | "away";
  team: FeaturedMatch["homeTeam"];
}

const formatMinute = (minute: number | null, injuryTime: number | null) => {
  if (minute == null) return "LIVE";
  if (injuryTime && injuryTime > 0) {
    const base = minute > 90 ? 90 : minute > 45 ? 45 : minute;
    return `${base}+${injuryTime}'`;
  }
  return `${minute}'`;
};

const Crest = ({
  team,
  className = "h-11 w-11",
}: {
  team: FeaturedMatch["homeTeam"];
  className?: string;
}) =>
  team.crest ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={team.crest} alt={team.name} className={`${className} object-contain`} />
  ) : (
    <div className={`${className} rounded-full bg-black/10`} />
  );

const GoalCelebration = ({ goal }: { goal: GoalInfo }) => {
  const [showDatamosh, setShowDatamosh] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShowDatamosh(true), DATAMOSH_START_MS);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <foreignObject x="4" y="15" width="542" height="52">
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative flex h-full w-full items-center justify-center overflow-visible rounded-full"
        style={{ backgroundColor: DARK }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
          className={`absolute top-1/2 z-20 h-[132px] w-[132px] -translate-y-1/2 ${
            goal.side === "home" ? "left-2" : "right-2"
          }`}
        >
          <Crest team={goal.team} className="h-full w-full" />
        </motion.div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <GoalPopCanvas />
        </div>

        {showDatamosh && <DatamoshOverlay />}
      </motion.div>
    </foreignObject>
  );
};

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
        <span className="text-[36px] text-black">:</span>
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
    if (process.env.NODE_ENV === "production") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !match) return;
      const side: GoalInfo["side"] = goal?.side === "home" ? "away" : "home";
      setGoal({ side, team: side === "home" ? match.homeTeam : match.awayTeam });
      if (goalTimeoutRef.current) clearTimeout(goalTimeoutRef.current);
      goalTimeoutRef.current = setTimeout(() => setGoal(null), GOAL_CELEBRATION_MS);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [match, goal]);

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
            match.isLive
              ? match.status === "PAUSED"
                ? "HT"
                : formatMinute(match.minute, match.injuryTime)
              : "FULL-TIME"
          }
        />
      </div>
    </div>
  );
};

export default FootballScore;
