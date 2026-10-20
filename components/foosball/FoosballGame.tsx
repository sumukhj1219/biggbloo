"use client";

import React, { forwardRef, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Matter from "matter-js";
import { motion, AnimatePresence } from "motion/react";
import { anton } from "@/lib/fonts";
import { GoalShutter } from "./shutter-type/GoalShutter";
import { LOOP_MS as GOAL_SHUTTER_LOOP_MS } from "./shutter-type/params";

const MATCH_SECONDS = 90;

const GOAL_ANIM_TOTAL_MS = GOAL_SHUTTER_LOOP_MS;

const SCOREBOARD_HEIGHT = 24;
const SCOREBOARD_SEGMENTS = [
  { key: "you-text", src: "/football/you-text.svg", width: 29, color: "#fff", fontSize: 12 },
  { key: "you-scorecard", src: "/football/you-scorecard.svg", width: 29, color: "#fff", fontSize: 14 },
  { key: "timer", src: "/football/timer.svg", width: 57, color: "#33291f", fontSize: 20 },
  { key: "ai-scorecard", src: "/football/ai-scorecard.svg", width: 29, color: "#fff", fontSize: 14 },
  { key: "ai-text", src: "/football/ai-text.svg", width: 29, color: "#fff", fontSize: 12 },
] as const;

const PHYSICS_WIDTH = 800;
const PHYSICS_HEIGHT = 400;
const ASPECT = PHYSICS_WIDTH / PHYSICS_HEIGHT;

// Thick walls so a hard kick can't tunnel the ball through them in a single physics step.
const WALL_THICKNESS = 80;
const GOAL_HEIGHT = 130;
const BALL_RADIUS = 8;

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
const REST_ANGLE = Math.PI / 2;
const KICK_DURATION_MS = 380;

const SLIDE_MARGIN = 22;
const DRAG_THRESHOLD = 8;

const AI_SLIDE_SPEED = 0.55;
const AI_KICK_RANGE = 55;
const AI_KICK_COOLDOWN_MS = 500;

const DROP_Y = 16;
const DROP_SPEED = 6.5;
const MIN_BALL_SPEED = 0.8;
const MAX_BALL_SPEED = 16;

const OUTFIELD_PIXEL = 3;
// How many grass cells reach in over the pitch edge, so the two blend instead of meeting at a line.
const OUTFIELD_OVERLAP = 4;
const OUTFIELD_GREENS = ["#4a5409", "#5E680D", "#6b7616", "#7a8622", "#86912C"];
const OUTFIELD_BLADE = "#9aa63a";

// Stable per-cell noise so the grass doesn't reshuffle on every resize.
const cellNoise = (x: number, y: number, seed: number) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

type FringeView = { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number };

// Paints pixel grass around the pitch that dissolves the further it gets from the touchline.
// The ragged fringe of grass that reaches in over the pitch edge goes to `fringe`, which the
// game draws under its players so it never hides the ball.
const drawOutfield = (
  canvas: HTMLCanvasElement,
  fringe: HTMLCanvasElement,
  frame: HTMLElement,
  pitch: HTMLElement,
): FringeView | null => {
  const cols = Math.ceil(frame.clientWidth / OUTFIELD_PIXEL);
  const rows = Math.ceil(frame.clientHeight / OUTFIELD_PIXEL);
  const layer = (c: HTMLCanvasElement) => {
    c.width = cols;
    c.height = rows;
    const g = c.getContext("2d");
    g?.clearRect(0, 0, cols, rows);
    return g;
  };
  canvas.style.width = `${cols * OUTFIELD_PIXEL}px`;
  canvas.style.height = `${rows * OUTFIELD_PIXEL}px`;
  const octx = layer(canvas);
  const fctx = layer(fringe);
  if (!octx || !fctx) return null;

  const left = pitch.offsetLeft / OUTFIELD_PIXEL;
  const top = pitch.offsetTop / OUTFIELD_PIXEL;
  const right = (pitch.offsetLeft + pitch.offsetWidth) / OUTFIELD_PIXEL;
  const bottom = (pitch.offsetTop + pitch.offsetHeight) / OUTFIELD_PIXEL;
  const band = Math.max(1, Math.min(left, cols - right, rows - bottom));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = Math.max(left - x - 0.5, x + 0.5 - right, 0);
      const dy = Math.max(top - y - 0.5, y + 0.5 - bottom, 0);
      const t = Math.hypot(dx, dy) / band;
      // Mix fine and clumpy noise so the edge breaks up into patches, not static.
      const n = 0.65 * cellNoise(x, y, 1) + 0.35 * cellNoise(x >> 2, y >> 2, 2);
      let target = octx;
      if (t === 0) {
        const inset = Math.min(x + 0.5 - left, right - x - 0.5, y + 0.5 - top, bottom - y - 0.5);
        // Cells straddling the pitch edge get solid grass underneath, so no page shows
        // through the sub-cell gap between the outfield and the pitch.
        if (inset < 1) {
          const shade = Math.floor(cellNoise(x, y, 4) * OUTFIELD_GREENS.length);
          octx.fillStyle = OUTFIELD_GREENS[shade];
          octx.fillRect(x, y, 1, 1);
        }
        const reach = inset / OUTFIELD_OVERLAP;
        if (reach >= 1 || n < 0.2 + 0.8 * Math.pow(reach, 0.7)) continue;
        target = fctx;
      } else if (t >= 1 || n < Math.pow(t, 0.8)) {
        continue;
      }
      const shade = Math.floor(cellNoise(x, y, 4) * OUTFIELD_GREENS.length);
      target.fillStyle = cellNoise(x, y, 3) < 0.06 ? OUTFIELD_BLADE : OUTFIELD_GREENS[shade];
      target.fillRect(x, y, 1, 1);
    }
  }

  return { canvas: fringe, x: left, y: top, w: right - left, h: bottom - top };
};

// Stadium light: sun spills in from the top-left corner over the stand's roof line, the rest of
// the pitch sits in the stand's shadow, and a cloud shadow drifts across every so often.
const SUN_EDGE = 0.42; // where the roof shadow's edge falls, along the corner-to-corner diagonal
const SUN_SOFTNESS = 0.07;
const SHADE_TINT = "#b4bccb"; // multiplied over the shaded part: darker and a touch cooler
const SUN_WARMTH = "rgba(255, 228, 170, 0.22)";
const SUN_GLOW = "rgba(255, 240, 205, 0.35)";
const CLOUD_PERIOD_MS = 30000;
const SPRITE_SHADOW = { x: 3.5, y: 3.5 };
const VIGNETTE = "#c9cfd8";
const CLOUD_ALPHA = 0.55;
const LIGHT_RES = 2;

// The shadow/sun split never changes, so it's painted once into an offscreen light map.
const makeLightMaps = () => {
  const w = PHYSICS_WIDTH * LIGHT_RES;
  const h = PHYSICS_HEIGHT * LIGHT_RES;
  const layer = () => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return { c, g: c.getContext("2d") };
  };
  // Gradient across the diagonal from the sunny corner, with a soft roof-shadow edge.
  const diagonal = (g: CanvasRenderingContext2D, lit: string, shade: string) => {
    const grad = g.createLinearGradient(0, 0, w * 0.75, h);
    grad.addColorStop(0, lit);
    grad.addColorStop(SUN_EDGE - SUN_SOFTNESS, lit);
    grad.addColorStop(SUN_EDGE + SUN_SOFTNESS, shade);
    grad.addColorStop(1, shade);
    return grad;
  };

  const shade = layer();
  if (shade.g) {
    shade.g.fillStyle = diagonal(shade.g, "#ffffff", SHADE_TINT);
    shade.g.fillRect(0, 0, w, h);
    // Broadcast-style falloff: the touchlines and corners sit a touch darker than the middle.
    const vignette = shade.g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
    vignette.addColorStop(0, "#ffffff");
    vignette.addColorStop(1, VIGNETTE);
    shade.g.globalCompositeOperation = "multiply";
    shade.g.fillStyle = vignette;
    shade.g.fillRect(0, 0, w, h);
  }

  const sun = layer();
  if (sun.g) {
    sun.g.fillStyle = diagonal(sun.g, SUN_WARMTH, "rgba(255, 228, 170, 0)");
    sun.g.fillRect(0, 0, w, h);
    // Light bloom spilling from beyond the corner; the sun itself stays off-pitch.
    const glow = sun.g.createRadialGradient(-w * 0.05, -h * 0.1, 0, -w * 0.05, -h * 0.1, w * 0.45);
    glow.addColorStop(0, SUN_GLOW);
    glow.addColorStop(1, "rgba(255, 240, 205, 0)");
    sun.g.fillStyle = glow;
    sun.g.fillRect(0, 0, w, h);
  }

  // A lumpy cloud shadow built from overlapping soft puffs.
  const cloud = document.createElement("canvas");
  cloud.width = PHYSICS_WIDTH * 0.7 * LIGHT_RES;
  cloud.height = PHYSICS_HEIGHT * 0.8 * LIGHT_RES;
  const cg = cloud.getContext("2d");
  if (cg) {
    const puffs = [
      [0.3, 0.5, 0.3],
      [0.5, 0.4, 0.34],
      [0.7, 0.55, 0.28],
      [0.45, 0.65, 0.26],
      [0.6, 0.3, 0.22],
    ];
    puffs.forEach(([px, py, pr]) => {
      const x = px * cloud.width;
      const y = py * cloud.height;
      const r = pr * cloud.width;
      const puff = cg.createRadialGradient(x, y, 0, x, y, r);
      puff.addColorStop(0, "rgba(20, 28, 40, 0.55)");
      puff.addColorStop(1, "rgba(20, 28, 40, 0)");
      cg.fillStyle = puff;
      cg.fillRect(0, 0, cloud.width, cloud.height);
    });
  }

  return { shade: shade.c, sun: sun.c, cloud };
};

// The turf is static, so it's painted once: mown stripes with a cross-cut, uneven colour from
// patchy growth, scuffed goalmouths and spots where players stand most, and fine grain.
const STRIPE_COUNT = 10;
const STRIPE_COLORS = ["#86912C", "#5E680D"];
const CROSS_CUT_BANDS = 6;
const WEAR = "rgba(140, 118, 64, 0.5)";

const makeTurf = () => {
  const turf = document.createElement("canvas");
  turf.width = PHYSICS_WIDTH * LIGHT_RES;
  turf.height = PHYSICS_HEIGHT * LIGHT_RES;
  const g = turf.getContext("2d");
  if (!g) return turf;
  g.scale(LIGHT_RES, LIGHT_RES);
  const W = PHYSICS_WIDTH;
  const H = PHYSICS_HEIGHT;

  const stripeW = W / STRIPE_COUNT;
  for (let i = 0; i < STRIPE_COUNT; i++) {
    g.fillStyle = STRIPE_COLORS[i % 2];
    g.fillRect(i * stripeW, 0, stripeW, H);
  }
  // Mowing the other way too leaves a faint checkerboard across the stripes.
  const bandH = H / CROSS_CUT_BANDS;
  for (let i = 0; i < CROSS_CUT_BANDS; i++) {
    g.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.04)";
    g.fillRect(0, i * bandH, W, bandH);
  }

  const blot = (x: number, y: number, r: number, color: string) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  // Patchy growth: broad, faint light and dark blotches.
  for (let i = 0; i < 70; i++) {
    const light = Math.random() < 0.5;
    blot(
      Math.random() * W,
      Math.random() * H,
      20 + Math.random() * 60,
      light ? "rgba(190, 200, 90, 0.07)" : "rgba(30, 45, 5, 0.08)",
    );
  }

  // Worn turf where play concentrates, with scattered bare specks around each patch.
  const midY = H / 2;
  const wear = (x: number, y: number, rx: number, ry: number, specks: number) => {
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    blot(0, 0, rx, WEAR);
    g.restore();
    for (let i = 0; i < specks; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random());
      g.fillStyle = `rgba(150, 125, 70, ${0.15 + Math.random() * 0.25})`;
      g.fillRect(x + Math.cos(a) * d * rx, y + Math.sin(a) * d * ry, 1 + Math.random(), 1 + Math.random());
    }
  };
  wear(14, midY, 34, 70, 140);
  wear(W - 14, midY, 34, 70, 140);
  wear(PENALTY_SPOT_X, midY, 10, 10, 25);
  wear(W - PENALTY_SPOT_X, midY, 10, 10, 25);
  wear(W / 2, midY, 22, 22, 60);

  // Fine grain so the grass doesn't read as flat paint.
  const grain = g.createImageData(turf.width, turf.height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const v = Math.random() * 255;
    grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = v;
    grain.data[i + 3] = 255;
  }
  const grainLayer = document.createElement("canvas");
  grainLayer.width = turf.width;
  grainLayer.height = turf.height;
  grainLayer.getContext("2d")?.putImageData(grain, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 0.1;
  g.globalCompositeOperation = "overlay";
  g.drawImage(grainLayer, 0, 0);
  return turf;
};

const TEAM_A_COLOR = "#3b6ef2";
const TEAM_B_COLOR = "#e6483f";

interface RodConfig {
  id: string;
  x: number;
  team: "a" | "b";
  playerYs: number[];
}

const GK_YS = [PHYSICS_HEIGHT / 2];
const DEF_YS = [
  PHYSICS_HEIGHT / 2 - 135,
  PHYSICS_HEIGHT / 2 - 45,
  PHYSICS_HEIGHT / 2 + 45,
  PHYSICS_HEIGHT / 2 + 135,
];
const MID_YS = [PHYSICS_HEIGHT / 2 - 110, PHYSICS_HEIGHT / 2, PHYSICS_HEIGHT / 2 + 110];
const FWD_YS = [PHYSICS_HEIGHT / 2 - 90, PHYSICS_HEIGHT / 2, PHYSICS_HEIGHT / 2 + 90];

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

type Team = "a" | "b";

const Scoreboard = ({ score, elapsed }: { score: Record<Team, number>; elapsed: number }) =>
  SCOREBOARD_SEGMENTS.map((seg, i) => (
    <div
      key={seg.key}
      className="relative shrink-0"
      style={{ width: seg.width, height: SCOREBOARD_HEIGHT, marginLeft: i === 0 ? 0 : -1 }}
    >
      <Image src={seg.src} alt="" width={seg.width} height={SCOREBOARD_HEIGHT} className="block" />
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
  ));

const FoosballGame = forwardRef<HTMLDivElement>((_props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ a: 0, b: 0 });
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [goalPulse, setGoalPulse] = useState<{ id: number; by: Team } | null>(null);
  const goalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameApiRef = useRef<{ start: () => void; pause: () => void } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const outfieldRef = useRef<HTMLCanvasElement>(null);
  const fringeViewRef = useRef<FringeView | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const outfield = outfieldRef.current;
    const pitch = containerRef.current;
    if (!frame || !outfield || !pitch) return;
    const fringe = document.createElement("canvas");
    const redraw = () => {
      fringeViewRef.current = drawOutfield(outfield, fringe, frame, pitch);
    };
    const observer = new ResizeObserver(redraw);
    observer.observe(frame);
    redraw();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || elapsed >= MATCH_SECONDS) {
      if (started && elapsed >= MATCH_SECONDS) gameApiRef.current?.pause();
      return;
    }
    const id = setTimeout(() => setElapsed((t) => t + 1), 1000);
    return () => clearTimeout(id);
  }, [started, elapsed]);

  const finished = started && elapsed >= MATCH_SECONDS;

  const handleReady = () => {
    setStarted(true);
    setScore({ a: 0, b: 0 });
    setElapsed(0);
    gameApiRef.current?.start();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const turf = makeTurf();
    const lightMaps = makeLightMaps();

    const runningRef = { current: false };

    const engine = Matter.Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = 0;

    const walls = [
      Matter.Bodies.rectangle(PHYSICS_WIDTH / 2, -WALL_THICKNESS / 2, PHYSICS_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS, { isStatic: true }),
      Matter.Bodies.rectangle(PHYSICS_WIDTH / 2, PHYSICS_HEIGHT + WALL_THICKNESS / 2, PHYSICS_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS, { isStatic: true }),
      Matter.Bodies.rectangle(-WALL_THICKNESS / 2, (PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2) / 2, WALL_THICKNESS, PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2, { isStatic: true }),
      Matter.Bodies.rectangle(-WALL_THICKNESS / 2, PHYSICS_HEIGHT - (PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2) / 2, WALL_THICKNESS, PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2, { isStatic: true }),
      Matter.Bodies.rectangle(PHYSICS_WIDTH + WALL_THICKNESS / 2, (PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2) / 2, WALL_THICKNESS, PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2, { isStatic: true }),
      Matter.Bodies.rectangle(PHYSICS_WIDTH + WALL_THICKNESS / 2, PHYSICS_HEIGHT - (PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2) / 2, WALL_THICKNESS, PHYSICS_HEIGHT / 2 - GOAL_HEIGHT / 2, { isStatic: true }),
    ];
    Matter.World.add(engine.world, walls);

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

    const triggerGoalFlash = (by: Team) => {
      setGoalPulse({ id: Date.now(), by });
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

      const vx = ball.velocity.x;
      const vy = ball.velocity.y;
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_BALL_SPEED) {
        const scale = MAX_BALL_SPEED / speed;
        Matter.Body.setVelocity(ball, { x: vx * scale, y: vy * scale });
      } else if (speed < MIN_BALL_SPEED) {
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

      // Anything that escapes the pitch other than through a goal mouth is put back in play.
      const out = BALL_RADIUS * 2;
      const { x: bx, y: by } = ball.position;
      const inGoalMouth = Math.abs(by - PHYSICS_HEIGHT / 2) < GOAL_HEIGHT / 2 + out;
      const offPitch = by < -out || by > PHYSICS_HEIGHT + out || bx < -out || bx > PHYSICS_WIDTH + out;
      if (offPitch && !inGoalMouth) {
        dropBall();
      } else if (ball.position.x < -BALL_RADIUS * 2) {
        setScore((s) => ({ ...s, b: s.b + 1 }));
        triggerGoalFlash("b");
        dropBall();
      } else if (ball.position.x > PHYSICS_WIDTH + BALL_RADIUS * 2) {
        setScore((s) => ({ ...s, a: s.a + 1 }));
        triggerGoalFlash("a");
        dropBall();
      }

      render();
      raf = requestAnimationFrame(step);
    };

    const render = () => {
      ctx.clearRect(0, 0, PHYSICS_WIDTH, PHYSICS_HEIGHT);

      ctx.drawImage(turf, 0, 0, PHYSICS_WIDTH, PHYSICS_HEIGHT);

      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      const midY = PHYSICS_HEIGHT / 2;

      ctx.strokeRect(
        PITCH_MARGIN,
        PITCH_MARGIN,
        PHYSICS_WIDTH - PITCH_MARGIN * 2,
        PHYSICS_HEIGHT - PITCH_MARGIN * 2,
      );

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

      const drawEndMarkings = (side: 1 | -1) => {
        const goalX = side === 1 ? 0 : PHYSICS_WIDTH;
        const dir = side;

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

      const drawGoal = (side: 1 | -1) => {
        const goalX = side === 1 ? -14 : PHYSICS_WIDTH - 2;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(goalX, midY - GOAL_HEIGHT / 2, 16, GOAL_HEIGHT);
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
      const fringe = fringeViewRef.current;
      if (fringe && fringe.w > 0 && fringe.h > 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(fringe.canvas, fringe.x, fringe.y, fringe.w, fringe.h, 0, 0, PHYSICS_WIDTH, PHYSICS_HEIGHT);
        ctx.restore();
      }

      drawGoal(1);
      drawGoal(-1);

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

      // Contact shadows for players and ball, cast away from the sun in the top-left corner.
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      rodStates.forEach((rod) => {
        rod.config.playerYs.forEach((baseY) => {
          ctx.beginPath();
          ctx.ellipse(
            rod.config.x + SPRITE_SHADOW.x,
            baseY + rod.slideOffset + SPRITE_SHADOW.y,
            PADDLE_WIDTH / 2 + 2,
            PADDLE_WIDTH / 2 + 1,
            Math.PI / 4,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        });
      });
      ctx.beginPath();
      ctx.ellipse(
        ball.position.x + SPRITE_SHADOW.x,
        ball.position.y + SPRITE_SHADOW.y,
        BALL_RADIUS + 1.5,
        BALL_RADIUS,
        Math.PI / 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

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

      drawLighting(performance.now());
    };

    // Lighting goes over everything, players and ball included, so they share the pitch's light.
    const drawLighting = (now: number) => {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(lightMaps.shade, 0, 0, PHYSICS_WIDTH, PHYSICS_HEIGHT);
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(lightMaps.sun, 0, 0, PHYSICS_WIDTH, PHYSICS_HEIGHT);

      // One cloud crosses per period, drifting left to right and slightly down.
      const cw = lightMaps.cloud.width / LIGHT_RES;
      const ch = lightMaps.cloud.height / LIGHT_RES;
      const t = (now % CLOUD_PERIOD_MS) / CLOUD_PERIOD_MS;
      const cx = -cw + t * (PHYSICS_WIDTH + cw);
      const cy = -ch * 0.35 + t * PHYSICS_HEIGHT * 0.3;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = CLOUD_ALPHA;
      ctx.drawImage(lightMaps.cloud, cx, cy, cw, ch);
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") triggerGoalFlash(e.shiftKey ? "b" : "a");
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
    <div className="w-full" ref={ref}>
      <div ref={frameRef} className="relative overflow-hidden p-6 sm:p-10">
        <canvas
          ref={outfieldRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0"
          style={{ imageRendering: "pixelated" }}
        />
        <div className="relative flex h-[18px] justify-center sm:h-6">
          {!started || finished ? (
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
              {finished ? "Restart" : "Ready"}
            </button>
          ) : (
            <div className="absolute inset-x-0 top-0 z-0 mx-auto flex w-fit origin-top scale-75 sm:scale-100">
              <motion.div
                initial={{ y: SCOREBOARD_HEIGHT }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex shadow"
              >
                <Scoreboard score={score} elapsed={elapsed} />
              </motion.div>
            </div>
          )}
        </div>
        <div
          ref={containerRef}
          className="relative z-10 -mt-px w-full overflow-hidden"
        >
          <canvas ref={canvasRef} className="block touch-none" />
          <AnimatePresence>
            {goalPulse !== null && (
              <motion.div
                key={goalPulse.id}
                className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-6 sm:p-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-full max-w-xs sm:max-w-sm">
                  <GoalShutter accent={goalPulse.by === "b" ? TEAM_B_COLOR : undefined} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Full time: the pitch blurs out and the final score rises slowly into the centre. */}
          <AnimatePresence>
            {finished && (
              <motion.div
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                initial={{ backdropFilter: "blur(0px)", backgroundColor: "rgba(0,0,0,0)" }}
                animate={{ backdropFilter: "blur(4px)", backgroundColor: "rgba(0,0,0,0.12)" }}
                exit={{ backdropFilter: "blur(0px)", backgroundColor: "rgba(0,0,0,0)", opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <motion.div
                  initial={{ y: 160, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="flex origin-center scale-100 shadow-lg sm:scale-150"
                >
                  <Scoreboard score={score} elapsed={elapsed} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground/60 sm:text-sm">
        Drag a rod to slide it, tap to kick
      </p>
    </div>
  );
});
FoosballGame.displayName = "FoosballGame";

export default FoosballGame;
