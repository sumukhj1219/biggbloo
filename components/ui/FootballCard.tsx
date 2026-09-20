"use client";

import React, { useEffect, useRef, useState } from "react";
import Container from "../common/Container";
import { DotmSquare1 } from "@/components/ui/dotm-square-1";
import { GoalPop } from "@/components/pop-type/GoalPop";
import type { FeaturedMatch } from "@/lib/football";

const POLL_INTERVAL_MS = 30_000;

type Side = "home" | "away";

const DEMO_MATCH: FeaturedMatch = {
  id: -1,
  isLive: false,
  status: "TIMED",
  utcDate: "",
  minute: null,
  injuryTime: null,
  competition: "Demo",
  stage: "",
  homeTeam: { name: "Home", shortName: "Home", tla: "HOM", crest: null },
  awayTeam: { name: "Away", shortName: "Away", tla: "AWY", crest: null },
  homeScore: 0,
  awayScore: 0,
};

const useFeaturedMatch = (onGoal: (side: Side) => void) => {
  const [match, setMatch] = useState<FeaturedMatch | null>(null);
  const [loaded, setLoaded] = useState(false);
  const onGoalRef = useRef(onGoal);
  const prevRef = useRef<FeaturedMatch | null>(null);

  useEffect(() => {
    onGoalRef.current = onGoal;
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/football-score");
        const data = await res.json();
        if (cancelled) return;
        const next: FeaturedMatch | null = data.match ?? null;
        const prev = prevRef.current;
        // A goal is a score increase between two polls of the same match.
        if (prev && next && prev.id === next.id) {
          if (next.homeScore > prev.homeScore) onGoalRef.current("home");
          if (next.awayScore > prev.awayScore) onGoalRef.current("away");
        }
        prevRef.current = next;
        setMatch(next);
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

  return { match, loaded };
};

const TeamRow = ({
  team,
  score,
  goalTick,
}: {
  team: FeaturedMatch["homeTeam"];
  score: number;
  goalTick: number;
}) => (
  <div className="relative flex h-14 w-[200px] items-center justify-between gap-x-2 rounded-sm bg-white px-3 text-black">
    <div className="flex min-w-0 items-center gap-x-2">
      {team.crest ? (
        <img
          src={team.crest}
          alt=""
          className="size-8 shrink-0 object-contain"
        />
      ) : (
        <span className="size-8 shrink-0 rounded-full bg-black/10" />
      )}
      <span className="text-3xl font-semibold tracking-wide" title={team.name}>
        {team.tla}
      </span>
    </div>
    <span className="text-3xl font-semibold tabular-nums">{score}</span>
    <GoalPop trigger={goalTick} />
  </div>
);

const FootballCard = () => {
  const [goals, setGoals] = useState<Record<Side, number>>({ home: 0, away: 0 });
  const nextTestSide = useRef<Side>("home");
  const addGoal = (side: Side) =>
    setGoals((g) => ({ ...g, [side]: g[side] + 1 }));
  const { match: liveMatch, loaded } = useFeaturedMatch(addGoal);

  const match =
    liveMatch ?? (loaded && process.env.NODE_ENV === "development" ? DEMO_MATCH : null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable]")) return;
      const side = nextTestSide.current;
      nextTestSide.current = side === "home" ? "away" : "home";
      setGoals((g) => ({ ...g, [side]: g[side] + 1 }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Container className="flex items-center justify-center mx-auto w-54 h-32 rounded-lg ring-6 ring-blue-500 p-1 bg-black">
      {match ? (
        <div className="flex flex-col gap-y-1">
          <TeamRow team={match.homeTeam} score={match.homeScore} goalTick={goals.home} />
          <TeamRow team={match.awayTeam} score={match.awayScore} goalTick={goals.away} />
        </div>
      ) : loaded ? (
        <span className="text-sm text-white/70">No match right now</span>
      ) : (
        <DotmSquare1 size={24} dotSize={3} ariaLabel="Loading match" className="text-white" />
      )}
    </Container>
  );
};

export default FootballCard;
