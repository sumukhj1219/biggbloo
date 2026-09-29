"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Matter from "matter-js";
import { motion, AnimatePresence } from "motion/react";
import { anton } from "@/lib/fonts";

const MATCH_SECONDS = 90;

// Goal celebration timing: bottom "GOAL!" slides up first, then the
// middle and top rows split in from either side, all three dim once
// settled, then the orange flash pops in/out, then everything exits left.
const GOAL_ROW_DELAYS = { top: 0.3, middle: 0.15, bottom: 0 };
const GOAL_DIM_DURATION = 1.1;
const GOAL_FLASH_DELAY = 1.5;
const GOAL_FLASH_DURATION = 1.2;
const GOAL_ANIM_TOTAL_MS = 3200;
const GOAL_EXIT = { x: -240, opacity: 0, transition: { duration: 0.4, ease: "easeIn" as const } };

// The five scoreboard pieces sit flush against each other (no gaps),
// left to right: you-text, you-scorecard, timer, ai-scorecard, ai-text.
// Widths are scaled down from the source assets' native 43/43/85/43/43
// at 36px tall, keeping each piece's aspect ratio at the new height.
const SCOREBOARD_HEIGHT = 24;
const SCOREBOARD_SEGMENTS = [
  { key: "you-text", src: "/football/you-text.svg", width: 29, color: "#fff", fontSize: 12 },
  { key: "you-scorecard", src: "/football/you-scorecard.svg", width: 29, color: "#fff", fontSize: 14 },
  { key: "timer", src: "/football/timer.svg", width: 57, color: "#33291f", fontSize: 20 },
  { key: "ai-scorecard", src: "/football/ai-scorecard.svg", width: 29, color: "#fff", fontSize: 14 },
  { key: "ai-text", src: "/football/ai-text.svg", width: 29, color: "#fff", fontSize: 12 },
] as const;

// Everything below is simulated in a fixed logical coordinate space
// (independent of actual screen pixels) — the canvas is resized/scaled
// responsively at render time, so physics behaves identically regardless
// of viewport width.
const PHYSICS_WIDTH = 800;
const PHYSICS_HEIGHT = 400;
const ASPECT = PHYSICS_WIDTH / PHYSICS_HEIGHT;

const WALL_THICKNESS = 20;
const GOAL_HEIGHT = 130;
const BALL_RADIUS = 8;

// Pitch markings, in the same physics units as everything else.
const PITCH_MARGIN = 6;
const CENTER_CIRCLE_RADIUS = 42;
const PENALTY_BOX_DEPTH = 90;
const PENALTY_BOX_HALF_HEIGHT = 110;
const GOAL_BOX_DEPTH = 35;
const GOAL_BOX_HALF_HEIGHT = 80;
const PENALTY_SPOT_X = 70;
const PENALTY_ARC_RADIUS = 50;
const CORNER_ARC_RADIUS = 10;

const PADDLE_LENGTH = 46;
const PADDLE_WIDTH = 12;
// Standing at rest: aligned with the rod (vertical), like a real foosball
// man before the rod is spun. A kick swings the leg out to horizontal,
// toward the opponent's side, then back to standing.
const REST_ANGLE = Math.PI / 2;
const KICK_DURATION_MS = 380;

// Sliding a rod up/down along its own line.
const SLIDE_MARGIN = 22;
const DRAG_THRESHOLD = 8;

// AI (red/team B): tracks the ball's Y at a bounded speed and kicks when
// the ball is close enough in X, with a cooldown so it doesn't spam.
const AI_SLIDE_SPEED = 0.55; // physics units per ms
const AI_KICK_RANGE = 55;
const AI_KICK_COOLDOWN_MS = 500;

// Ball (re)spawns by dropping in from the top of the pitch and rolling
// wherever momentum + friction take it — no artificial re-centering.
const DROP_Y = 16;
const DROP_SPEED = 6.5;
// The ball is never allowed to fully settle — once its speed decays
// below this floor it's nudged back up, so it keeps drifting slowly.
const MIN_BALL_SPEED = 0.8;

const TEAM_A_COLOR = "#3b6ef2";
const TEAM_B_COLOR = "#e6483f";

interface RodConfig {
  id: string;
  x: number;
  team: "a" | "b";
  playerYs: number[];
}

// A real 4-3-3: goalkeeper + 4 defenders + 3 midfielders + 3 forwards =
// 11 players (four rods) per side, mirrored across the pitch.
const GK_YS = [PHYSICS_HEIGHT / 2];
const DEF_YS = [
  PHYSICS_HEIGHT / 2 - 135,
  PHYSICS_HEIGHT / 2 - 45,
  PHYSICS_HEIGHT / 2 + 45,
  PHYSICS_HEIGHT / 2 + 135,
];
const MID_YS = [PHYSICS_HEIGHT / 2 - 110, PHYSICS_HEIGHT / 2, PHYSICS_HEIGHT / 2 + 110];
const FWD_YS = [PHYSICS_HEIGHT / 2 - 90, PHYSICS_HEIGHT / 2, PHYSICS_HEIGHT / 2 + 90];

// Real tables don't cluster each team on its own half — the rods
// interleave down the length of the table, so a team's defense directly
// faces the opponent's attack, and the two midfields sit side by side
// straddling the halfway line.
const RODS: RodConfig[] = [
  { id: "a-gk", x: 40, team: "a", playerYs: GK_YS },
  { id: "a-def", x: 140, team: "a", playerYs: DEF_YS },
  { id: "b-fwd", x: 230, team: "b", playerYs: FWD_YS },
  { id: "a-mid", x: 320, team: "a", playerYs: MID_YS },
  { id: "b-mid", x: 480, team: "b", playerYs: MID_YS },
  { id: "a-fwd", x: 570, team: "a", playerYs: FWD_YS },
  { id: "b-def", x: 660, team: "b", playerYs: DEF_YS },
  { id: "b-gk", x: 760, team: "b", playerYs: GK_YS },
];

interface RodState {
  config: RodConfig;
  bodies: Matter.Body[];
  angle: number;
  kickStartAngle: number;
  kickTargetAngle: number;
  kickStart: number | null;
  slideOffset: number;
  slideRange: [number, number];
  lastAiKick: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const FoosballGame = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ a: 0, b: 0 });
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [goalPulse, setGoalPulse] = useState<number | null>(null);
  const goalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameApiRef = useRef<{ start: () => void; pause: () => void } | null>(null);

  // Counts up from 0 to the 90s match length, outside the physics effect
  // so it can drive React state without re-running the whole simulation.
  useEffect(() => {
    if (!started || elapsed >= MATCH_SECONDS) {
      if (started && elapsed >= MATCH_SECONDS) gameApiRef.current?.pause();
      return;
    }
    const id = setTimeout(() => setElapsed((t) => t + 1), 1000);
    return () => clearTimeout(id);
  }, [started, elapsed]);

  const handleReady = () => {
    setStarted(true);
    setElapsed(0);
    gameApiRef.current?.start();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fine film-grain, tiled across the turf so it doesn't read as flat,
    // perfectly smooth color. Generated (rather than reusing the site's
    // big-blob noise.png mask, which tiles as ugly splotches at this
    // scale) as a small random-grayscale tile repeated via a pattern.
    const grainTile = document.createElement("canvas");
    grainTile.width = 64;
    grainTile.height = 64;
    const grainCtx = grainTile.getContext("2d");
    let grainPattern: CanvasPattern | null = null;
    if (grainCtx) {
      const imageData = grainCtx.createImageData(64, 64);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const v = Math.floor(Math.random() * 255);
        imageData.data[i] = v;
        imageData.data[i + 1] = v;
        imageData.data[i + 2] = v;
        imageData.data[i + 3] = 255;
      }
      grainCtx.putImageData(imageData, 0, 0);
      grainPattern = ctx.createPattern(grainTile, "repeat");
    }

    // Nothing moves or responds to input until the Ready button flips
    // this on — the pitch still renders, just frozen.
    const runningRef = { current: false };

    const engine = Matter.Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = 0;

    const walls = [
      Matter.Bodies.rectangle(PHYSICS_WIDTH / 2, -WALL_THICKNESS / 2, PHYSICS_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS, { isStatic: true }),
      Matter.Bodies.rectangle(PHYSICS_WIDTH / 2, PHYSICS_HEIGHT + WALL_THICKNESS / 2, PHYSICS_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS, { isStatic: true }),
      // Left/right walls split above + below the goal gap, not spanning it.
      Matter.Bodies.rectangle(-WALL_THICKNESS / 2, (PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2) / 2, WALL_THICKNESS, PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2, { isStatic: true }),
      Matter.Bodies.rectangle(-WALL_THICKNESS / 2, PHYSICS_HEIGHT - (PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2) / 2, WALL_THICKNESS, PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2, { isStatic: true }),
      Matter.Bodies.rectangle(PHYSICS_WIDTH + WALL_THICKNESS / 2, (PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2) / 2, WALL_THICKNESS, PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2, { isStatic: true }),
      Matter.Bodies.rectangle(PHYSICS_WIDTH + WALL_THICKNESS / 2, PHYSICS_HEIGHT - (PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2) / 2, WALL_THICKNESS, PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2, { isStatic: true }),
    ];
    Matter.World.add(engine.world, walls);

    // Sits still at center until the match actually starts.
    const ball = Matter.Bodies.circle(PHYSICS_WIDTH / 2, PHYSICS_HEIGHT / 2, BALL_RADIUS, {
      restitution: 0.85,
      friction: 0.02,
      frictionAir: 0.006,
      density: 0.0008,
      label: "ball",
    });
    Matter.World.add(engine.world, ball);

    const rodStates: RodState[] = RODS.map((config) => {
      const bodies = config.playerYs.map((y) =>
        Matter.Bodies.rectangle(config.x, y, PADDLE_LENGTH, PADDLE_WIDTH, {
          friction: 0.05,
          restitution: 0.6,
          density: 0.02,
          label: `paddle-${config.id}`,
        }),
      );
      Matter.World.add(engine.world, bodies);
      const minY = Math.min(...config.playerYs);
      const maxY = Math.max(...config.playerYs);
      const slideRange: [number, number] = [
        SLIDE_MARGIN - minY,
        PHYSICS_HEIGHT - SLIDE_MARGIN - maxY,
      ];
      return {
        config,
        bodies,
        angle: REST_ANGLE,
        kickStartAngle: REST_ANGLE,
        kickTargetAngle: REST_ANGLE,
        kickStart: null,
        slideOffset: 0,
        slideRange,
        lastAiKick: -Infinity,
      };
    });

    const dropBall = () => {
      const dropX = PHYSICS_WIDTH / 2 + (Math.random() - 0.5) * 160;
      Matter.Body.setPosition(ball, { x: dropX, y: DROP_Y });
      Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 2, y: DROP_SPEED });
      Matter.Body.setAngularVelocity(ball, 0);
    };

    const triggerGoalFlash = () => {
      const id = Date.now();
      setGoalPulse(id);
      if (goalTimeoutRef.current) clearTimeout(goalTimeoutRef.current);
      goalTimeoutRef.current = setTimeout(() => setGoalPulse(null), GOAL_ANIM_TOTAL_MS);
    };

    gameApiRef.current = {
      start: () => {
        runningRef.current = true;
        dropBall();
      },
      pause: () => {
        runningRef.current = false;
      },
    };

    const triggerKick = (rod: RodState, now: number) => {
      if (rod.kickStart !== null) return;
      // Kick swings toward the opponent's goal: team "a" faces +x, team
      // "b" faces -x, starting from whatever the leg's current angle is.
      rod.kickStartAngle = rod.angle;
      rod.kickTargetAngle = rod.config.team === "a" ? 0 : Math.PI;
      rod.kickStart = now;
    };

    let raf = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(now - lastTime, 32);
      lastTime = now;

      if (!runningRef.current) {
        render();
        raf = requestAnimationFrame(step);
        return;
      }

      rodStates.forEach((rod) => {
        // AI: slide to track the ball, kick when it's in range.
        if (rod.config.team === "b") {
          const desired = clamp(
            ball.position.y - PHYSICS_HEIGHT / 2,
            rod.slideRange[0],
            rod.slideRange[1],
          );
          const maxStep = AI_SLIDE_SPEED * dt;
          rod.slideOffset += clamp(desired - rod.slideOffset, -maxStep, maxStep);

          const dx = Math.abs(ball.position.x - rod.config.x);
          if (dx < AI_KICK_RANGE && now - rod.lastAiKick > AI_KICK_COOLDOWN_MS) {
            triggerKick(rod, now);
            rod.lastAiKick = now;
          }
        }

        let targetAngle = rod.angle;
        if (rod.kickStart !== null) {
          const elapsed = now - rod.kickStart;
          const half = KICK_DURATION_MS / 2;
          if (elapsed >= KICK_DURATION_MS) {
            targetAngle = REST_ANGLE;
            rod.kickStart = null;
          } else if (elapsed <= half) {
            const t = elapsed / half;
            targetAngle = rod.kickStartAngle + (rod.kickTargetAngle - rod.kickStartAngle) * easeOutBack(t);
          } else {
            const t = (elapsed - half) / half;
            targetAngle = rod.kickTargetAngle + (REST_ANGLE - rod.kickTargetAngle) * easeOutBack(t);
          }
        }

        const prevAngle = rod.angle;
        rod.angle = targetAngle;
        const angularVel = dt > 0 ? (rod.angle - prevAngle) / (dt / 16.667) : 0;

        rod.bodies.forEach((body, i) => {
          const y = rod.config.playerYs[i] + rod.slideOffset;
          Matter.Body.setPosition(body, { x: rod.config.x, y });
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
          Matter.Body.setAngle(body, rod.angle);
          Matter.Body.setAngularVelocity(body, angularVel);
        });
      });

      Matter.Engine.update(engine, dt);

      // Never let the ball come to a full stop — air friction is real
      // (kicks slow down over time) but once it decays below a slow
      // drift, nudge it back up to that floor instead of settling dead.
      const vx = ball.velocity.x;
      const vy = ball.velocity.y;
      const speed = Math.hypot(vx, vy);
      if (speed < MIN_BALL_SPEED) {
        if (speed < 0.001) {
          const angle = Math.random() * Math.PI * 2;
          Matter.Body.setVelocity(ball, {
            x: Math.cos(angle) * MIN_BALL_SPEED,
            y: Math.sin(angle) * MIN_BALL_SPEED,
          });
        } else {
          const scale = MIN_BALL_SPEED / speed;
          Matter.Body.setVelocity(ball, { x: vx * scale, y: vy * scale });
        }
      }

      if (ball.position.x < -BALL_RADIUS * 2) {
        setScore((s) => ({ ...s, b: s.b + 1 }));
        triggerGoalFlash();
        dropBall();
      } else if (ball.position.x > PHYSICS_WIDTH + BALL_RADIUS * 2) {
        setScore((s) => ({ ...s, a: s.a + 1 }));
        triggerGoalFlash();
        dropBall();
      }

      render();
      raf = requestAnimationFrame(step);
    };

    const render = () => {
      ctx.clearRect(0, 0, PHYSICS_WIDTH, PHYSICS_HEIGHT);

      // Pitch — mown-stripe turf, alternating bands across the width.
      const STRIPE_COUNT = 10;
      const stripeW = PHYSICS_WIDTH / STRIPE_COUNT;
      for (let i = 0; i < STRIPE_COUNT; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#86912C" : "#5E680D";
        ctx.fillRect(i * stripeW, 0, stripeW, PHYSICS_HEIGHT);
      }

      // Grass grain — breaks up the flat stripe fill so it doesn't read
      // as smooth solid color.
      if (grainPattern) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.globalCompositeOperation = "overlay";
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, PHYSICS_WIDTH, PHYSICS_HEIGHT);
        ctx.restore();
      }

      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      const midY = PHYSICS_HEIGHT / 2;

      // Touchlines / goal lines (outer boundary)
      ctx.strokeRect(
        PITCH_MARGIN,
        PITCH_MARGIN,
        PHYSICS_WIDTH - PITCH_MARGIN * 2,
        PHYSICS_HEIGHT - PITCH_MARGIN * 2,
      );

      // Halfway line + center circle + center spot
      ctx.beginPath();
      ctx.moveTo(PHYSICS_WIDTH / 2, PITCH_MARGIN);
      ctx.lineTo(PHYSICS_WIDTH / 2, PHYSICS_HEIGHT - PITCH_MARGIN);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(PHYSICS_WIDTH / 2, midY, CENTER_CIRCLE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.arc(PHYSICS_WIDTH / 2, midY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Corner arcs
      const corners: [number, number, number, number][] = [
        [PITCH_MARGIN, PITCH_MARGIN, 0, Math.PI / 2],
        [PHYSICS_WIDTH - PITCH_MARGIN, PITCH_MARGIN, Math.PI / 2, Math.PI],
        [PHYSICS_WIDTH - PITCH_MARGIN, PHYSICS_HEIGHT - PITCH_MARGIN, Math.PI, Math.PI * 1.5],
        [PITCH_MARGIN, PHYSICS_HEIGHT - PITCH_MARGIN, Math.PI * 1.5, Math.PI * 2],
      ];
      corners.forEach(([cx, cy, start, end]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, CORNER_ARC_RADIUS, start, end);
        ctx.stroke();
      });

      // Penalty + six-yard boxes and arc, mirrored for both ends
      const drawEndMarkings = (side: 1 | -1) => {
        const goalX = side === 1 ? 0 : PHYSICS_WIDTH;
        const dir = side; // +1: box extends rightward from x=0; -1: leftward from x=PHYSICS_WIDTH

        ctx.strokeRect(
          goalX,
          midY - PENALTY_BOX_HALF_HEIGHT,
          dir * PENALTY_BOX_DEPTH,
          PENALTY_BOX_HALF_HEIGHT * 2,
        );
        ctx.strokeRect(
          goalX,
          midY - GOAL_BOX_HALF_HEIGHT,
          dir * GOAL_BOX_DEPTH,
          GOAL_BOX_HALF_HEIGHT * 2,
        );

        const spotX = goalX + dir * PENALTY_SPOT_X;
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.arc(spotX, midY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // The "D": arc of the circle around the penalty spot that falls
        // outside the box line.
        const boxEdgeX = goalX + dir * PENALTY_BOX_DEPTH;
        const dx = Math.abs(boxEdgeX - spotX);
        const halfAngle = Math.acos(clamp(dx / PENALTY_ARC_RADIUS, -1, 1));
        const center = side === 1 ? 0 : Math.PI;
        ctx.beginPath();
        ctx.arc(spotX, midY, PENALTY_ARC_RADIUS, center - halfAngle, center + halfAngle);
        ctx.stroke();
      };
      drawEndMarkings(1);
      drawEndMarkings(-1);

      // Goals — recessed net behind the goal line, with post caps.
      const drawGoal = (side: 1 | -1) => {
        const goalX = side === 1 ? -14 : PHYSICS_WIDTH - 2;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(goalX, midY - GOAL_HEIGHT / 2, 16, GOAL_HEIGHT);
        // Net crosshatch
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          const nx = goalX + (i * 16) / 4;
          ctx.beginPath();
          ctx.moveTo(nx, midY - GOAL_HEIGHT / 2);
          ctx.lineTo(nx, midY + GOAL_HEIGHT / 2);
          ctx.stroke();
        }
        for (let i = 1; i < 6; i++) {
          const ny = midY - GOAL_HEIGHT / 2 + (i * GOAL_HEIGHT) / 6;
          ctx.beginPath();
          ctx.moveTo(goalX, ny);
          ctx.lineTo(goalX + 16, ny);
          ctx.stroke();
        }
        // Posts
        ctx.fillStyle = "#f4f4f4";
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        const postX = side === 1 ? goalX + 16 : goalX;
        [midY - GOAL_HEIGHT / 2, midY + GOAL_HEIGHT / 2].forEach((py) => {
          ctx.beginPath();
          ctx.arc(postX, py, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      };
      drawGoal(1);
      drawGoal(-1);

      // Rods (metal bar visual, full height) — a soft drop shadow gives
      // them a sense of sitting above the pitch surface.
      rodStates.forEach((rod) => {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.strokeStyle = "rgba(210,210,220,0.9)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(rod.config.x, 4);
        ctx.lineTo(rod.config.x, PHYSICS_HEIGHT - 4);
        ctx.stroke();
        ctx.restore();
      });

      // Players — seen from directly above, a standing man is just a
      // head (his body points straight down, foreshortened to nothing).
      // Rotating the rod tips him toward horizontal, and the body swings
      // into view, growing out from under the head as it goes.
      rodStates.forEach((rod) => {
        const color = rod.config.team === "a" ? TEAM_A_COLOR : TEAM_B_COLOR;
        const h = PADDLE_WIDTH;
        const bodyLength = PADDLE_LENGTH * Math.abs(Math.sin(rod.angle - REST_ANGLE));
        rod.config.playerYs.forEach((baseY) => {
          ctx.save();
          ctx.translate(rod.config.x, baseY + rod.slideOffset);
          ctx.rotate(rod.angle);

          if (bodyLength > 1.5) {
            ctx.fillStyle = color;
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-bodyLength / 2, -h / 2, bodyLength, h, h / 2);
            ctx.fill();
            ctx.stroke();
          }

          ctx.restore();

          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.lineWidth = 1.2;
          ctx.arc(rod.config.x, baseY + rod.slideOffset, h / 2 + 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      });

      // Ball — a colorful swirl inspired by the 2026 World Cup ball
      // (pink/yellow/teal panels on white), rotated with the ball's own
      // spin so it visibly rolls as it moves.
      ctx.save();
      ctx.translate(ball.position.x, ball.position.y);
      ctx.rotate(ball.angle);

      ctx.beginPath();
      ctx.fillStyle = "#fdfdfb";
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
      ctx.clip();
      const petalColors = ["#F23A8B", "#F5D908", "#12B6C9"];
      petalColors.forEach((color, i) => {
        ctx.save();
        ctx.rotate((i * 2 * Math.PI) / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(BALL_RADIUS * 0.9, -BALL_RADIUS * 0.4, BALL_RADIUS * 1.3, 0);
        ctx.quadraticCurveTo(BALL_RADIUS * 0.9, BALL_RADIUS * 0.4, 0, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();

      ctx.restore();
    };

    const resize = () => {
      const cssWidth = container.clientWidth;
      const cssHeight = cssWidth / ASPECT;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      const scale = (cssWidth * dpr) / PHYSICS_WIDTH;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const pointToPhysics = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;
      return {
        x: (cssX / rect.width) * PHYSICS_WIDTH,
        y: (cssY / rect.height) * PHYSICS_HEIGHT,
      };
    };

    // Dragging a rod slides it along its own line; releasing without much
    // movement counts as a tap (kick) instead. Only team "a" (blue, the
    // human player) responds — team "b" is AI-controlled.
    let drag: { rod: RodState; startY: number; startOffset: number; moved: boolean } | null = null;

    const handlePointerDown = (e: PointerEvent) => {
      if (!runningRef.current) return;
      const { x, y } = pointToPhysics(e.clientX, e.clientY);
      if (y < 0 || y > PHYSICS_HEIGHT) return;
      let nearest: RodState | null = null;
      let nearestDist = Infinity;
      for (const rod of rodStates) {
        const d = Math.abs(rod.config.x - x);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = rod;
        }
      }
      if (nearest && nearest.config.team === "a" && nearestDist < 45) {
        drag = { rod: nearest, startY: y, startOffset: nearest.slideOffset, moved: false };
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!drag) return;
      const { y } = pointToPhysics(e.clientX, e.clientY);
      const deltaY = y - drag.startY;
      if (Math.abs(deltaY) > DRAG_THRESHOLD) drag.moved = true;
      drag.rod.slideOffset = clamp(
        drag.startOffset + deltaY,
        drag.rod.slideRange[0],
        drag.rod.slideRange[1],
      );
    };

    const handlePointerUp = () => {
      if (!drag) return;
      if (!drag.moved) triggerKick(drag.rod, performance.now());
      drag = null;
    };

    // Force-triggers the goal celebration on demand.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") triggerGoalFlash();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      if (goalTimeoutRef.current) clearTimeout(goalTimeoutRef.current);
    };
  }, []);

  return (
    <div className="w-full">
      {/* Reserves the resting spot right above the field's edge. The
          scoreboard itself starts positioned down behind the canvas (lower
          z-index, overlapping into it) and rises up from under it. */}
      <div className="relative flex h-[18px] justify-center sm:h-6">
        {!started ? (
          <button
            onClick={handleReady}
            className={`${anton.className} relative z-10 flex origin-top scale-75 items-center px-5 text-sm uppercase tracking-wide text-black transition-opacity hover:opacity-90 sm:scale-100 sm:text-lg`}
            style={{
              height: SCOREBOARD_HEIGHT,
              backgroundColor: "#2ecc16",
              border: "2px solid #fff",
              boxShadow: "inset 0 2px 5px rgba(0,0,0,0.4)",
              clipPath: "polygon(8px 0, calc(100% - 8px) 0, 100% 100%, 0 100%)",
            }}
          >
            Ready
          </button>
        ) : (
          <div className="absolute inset-x-0 top-0 z-0 mx-auto flex w-fit origin-top scale-75 sm:scale-100">
            <motion.div
              initial={{ y: SCOREBOARD_HEIGHT }}
              animate={{ y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex shadow"
            >
              {SCOREBOARD_SEGMENTS.map((seg, i) => (
                <div
                  key={seg.key}
                  className="relative shrink-0"
                  style={{ width: seg.width, height: SCOREBOARD_HEIGHT, marginLeft: i === 0 ? 0 : -1 }}
                >
                  <Image
                    src={seg.src}
                    alt=""
                    width={seg.width}
                    height={SCOREBOARD_HEIGHT}
                    className="block"
                  />
                  <span
                    className={`${anton.className} absolute inset-0 flex items-center justify-center leading-none tracking-wide tabular-nums`}
                    style={{ color: seg.color, fontSize: seg.fontSize }}
                  >
                    {seg.key === "you-text" && "YOU"}
                    {seg.key === "you-scorecard" && score.a}
                    {seg.key === "timer" && `${String(elapsed).padStart(2, "0")}:00`}
                    {seg.key === "ai-scorecard" && score.b}
                    {seg.key === "ai-text" && "AI"}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </div>
      <div
        ref={containerRef}
        className="relative z-10 -mt-px w-full overflow-hidden rounded-lg shadow-sm ring-1 ring-black/10"
      >
        <canvas ref={canvasRef} className="block touch-none" />
        <AnimatePresence>
          {goalPulse !== null && (
            <motion.div
              key={goalPulse}
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
            >
              <div className="relative flex flex-col items-center gap-y-1">
                {/* Top row — splits in from either side, last to arrive. */}
                <div className={`${anton.className} flex text-2xl text-black sm:text-4xl`}>
                  <motion.span
                    initial={{ x: -60, opacity: 0 }}
                    animate={{ x: 0, opacity: [0, 1, 1, 0.25] }}
                    transition={{
                      x: { delay: GOAL_ROW_DELAYS.top, duration: 0.35, ease: "easeOut" },
                      opacity: {
                        delay: GOAL_ROW_DELAYS.top,
                        duration: GOAL_DIM_DURATION,
                        times: [0, 0.3, 0.75, 1],
                      },
                    }}
                    exit={GOAL_EXIT}
                  >
                    GO
                  </motion.span>
                  <motion.span
                    initial={{ x: 60, opacity: 0 }}
                    animate={{ x: 0, opacity: [0, 1, 1, 0.25] }}
                    transition={{
                      x: { delay: GOAL_ROW_DELAYS.top, duration: 0.35, ease: "easeOut" },
                      opacity: {
                        delay: GOAL_ROW_DELAYS.top,
                        duration: GOAL_DIM_DURATION,
                        times: [0, 0.3, 0.75, 1],
                      },
                    }}
                    exit={GOAL_EXIT}
                  >
                    AL!
                  </motion.span>
                </div>

                {/* Middle row — same split, arrives second. */}
                <div className={`${anton.className} flex text-2xl text-black sm:text-4xl`}>
                  <motion.span
                    initial={{ x: -60, opacity: 0 }}
                    animate={{ x: 0, opacity: [0, 1, 1, 0.25] }}
                    transition={{
                      x: { delay: GOAL_ROW_DELAYS.middle, duration: 0.35, ease: "easeOut" },
                      opacity: {
                        delay: GOAL_ROW_DELAYS.middle,
                        duration: GOAL_DIM_DURATION,
                        times: [0, 0.3, 0.75, 1],
                      },
                    }}
                    exit={GOAL_EXIT}
                  >
                    GO
                  </motion.span>
                  <motion.span
                    initial={{ x: 60, opacity: 0 }}
                    animate={{ x: 0, opacity: [0, 1, 1, 0.25] }}
                    transition={{
                      x: { delay: GOAL_ROW_DELAYS.middle, duration: 0.35, ease: "easeOut" },
                      opacity: {
                        delay: GOAL_ROW_DELAYS.middle,
                        duration: GOAL_DIM_DURATION,
                        times: [0, 0.3, 0.75, 1],
                      },
                    }}
                    exit={GOAL_EXIT}
                  >
                    AL!
                  </motion.span>
                </div>

                {/* Bottom row — slides up first. */}
                <motion.div
                  className={`${anton.className} text-2xl text-black sm:text-4xl`}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: [0, 1, 1, 0.25] }}
                  transition={{
                    y: { delay: GOAL_ROW_DELAYS.bottom, duration: 0.4, ease: "easeOut" },
                    opacity: {
                      delay: GOAL_ROW_DELAYS.bottom,
                      duration: GOAL_DIM_DURATION,
                      times: [0, 0.3, 0.75, 1],
                    },
                  }}
                  exit={GOAL_EXIT}
                >
                  GOAL!
                </motion.div>

                {/* Flashy orange pop, appears once the three rows have
                    dimmed — scales in, strobes between orange and yellow
                    while held, then scales back out. */}
                <motion.div
                  className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded px-6 py-2 shadow-lg"
                  initial={{ scale: 0, opacity: 0, backgroundColor: "#f97316" }}
                  animate={{
                    scale: [0, 1.3, 1, 1, 0],
                    opacity: [0, 1, 1, 1, 0],
                    backgroundColor: [
                      "#f97316",
                      "#f97316",
                      "#fde047",
                      "#f97316",
                      "#fde047",
                      "#f97316",
                      "#fde047",
                      "#f97316",
                      "#f97316",
                    ],
                  }}
                  transition={{
                    scale: {
                      delay: GOAL_FLASH_DELAY,
                      duration: GOAL_FLASH_DURATION,
                      times: [0, 0.2, 0.3, 0.9, 1],
                      ease: "easeOut",
                    },
                    opacity: {
                      delay: GOAL_FLASH_DELAY,
                      duration: GOAL_FLASH_DURATION,
                      times: [0, 0.2, 0.3, 0.9, 1],
                      ease: "easeOut",
                    },
                    backgroundColor: {
                      delay: GOAL_FLASH_DELAY,
                      duration: GOAL_FLASH_DURATION,
                      times: [0, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                      ease: "linear",
                    },
                  }}
                  exit={GOAL_EXIT}
                >
                  <span className={`${anton.className} text-2xl text-black sm:text-4xl`}>
                    GOAL!
                  </span>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground/60 sm:text-sm">
        Drag a rod to slide it, tap to kick
      </p>
    </div>
  );
};

export default FoosballGame;
