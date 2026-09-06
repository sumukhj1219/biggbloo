"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { spriteUrl, variantsFor, type Placed, type Variant } from "./manifest";

function hapticTap() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10);
  }
}

const SLAM_EASE = "cubic-bezier(.34,1.56,.64,1)";
const WIDTH_EASE = "cubic-bezier(.22,.61,.36,1)";
const RISE_EASE = "cubic-bezier(.16,1,.3,1)";
const IN_MS = 460;
const OUT_MS = 240;
const STAGGER_MS = 26;
const SWAP_MS = 260;

export function RansomLine({
  placed,
  lineH,
  revealed = true,
  direction = "in",
  staggerStart = 0,
  nowrap = false,
  className = "",
}: {
  placed: Placed[];
  lineH: number;
  revealed?: boolean;
  direction?: "in" | "out";
  staggerStart?: number;
  nowrap?: boolean;
  className?: string;
}) {
  let gi = staggerStart;
  return (
    <div
      className={`flex items-center justify-center ${nowrap ? "flex-nowrap" : "flex-wrap"} ${className}`}
      style={{ gap: `${lineH * 0.04}px` }}
    >
      {placed.map((p, i) => {
        if (p.kind === "space") {
          return <span key={i} style={{ width: `${lineH * 0.32}px` }} aria-hidden />;
        }
        return (
          <Scrap key={i} p={p} lineH={lineH} revealed={revealed} direction={direction} idx={gi++} />
        );
      })}
    </div>
  );
}

// One cutout letter. Owns two things beyond rendering:
//  • the entrance/exit slam (inner <img> transform, staggered per idx),
//  • the click-to-reroll swap between paper scraps for the same letter.
function Scrap({
  p,
  lineH,
  revealed,
  direction,
  idx,
}: {
  p: Placed;
  lineH: number;
  revealed: boolean;
  direction: "in" | "out";
  idx: number;
}) {
  const [override, setOverride] = useState<{ base: Variant; picked: Variant } | null>(null);
  const variant = override && override.base === p.variant ? override.picked : p.variant!;

  const [incoming, setIncoming] = useState<Variant | null>(null);
  const [outgoing, setOutgoing] = useState<Variant | null>(null);
  const swapTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (swapTimer.current) window.clearTimeout(swapTimer.current);
  }, []);

  const h = lineH * p.scale;
  const aspect = (vr: Variant) => (vr.w / vr.h) * h;
  const w = aspect(variant);

  const boxW = incoming ? aspect(incoming) : w;

  const baseY = (p.dy * lineH).toFixed(2);
  const leanTransform = `translate(var(--px, 0px), calc(${baseY}px + var(--py, 0px))) rotate(var(--pr, 0deg)) scale(var(--ps, 1))`;
  const restInner = `translateY(0px) rotate(${p.rot}deg) scale(1)`;

  const RISE = Math.max(10, lineH * 0.18);
  const hiddenInner =
    direction === "in"
      ? `translateY(${RISE.toFixed(1)}px) rotate(${(p.rot * 1.25).toFixed(2)}deg) scale(0.96)`
      : `translateY(${(-RISE * 0.8).toFixed(1)}px) rotate(${(p.rot * 0.8).toFixed(2)}deg) scale(0.98)`;

  const SHADOW = "drop-shadow(0 2px 3px rgba(20,20,25,0.16)) drop-shadow(0 6px 10px rgba(20,20,30,0.10))";
  const blurAmt = revealed ? 0 : direction === "in" ? 3.5 : 5;

  const swap = () => {
    if (incoming) return;
    const all = variantsFor(p.ch);
    const others = all.filter((v) => v.file !== variant.file);
    if (!others.length) return;
    hapticTap();
    const next = others[Math.floor(Math.random() * others.length)];

    setOverride({ base: p.variant!, picked: next });
    setOutgoing(variant);
    setIncoming(next);
    swapTimer.current = window.setTimeout(() => {
      setOutgoing(null);
      setIncoming(null);
    }, SWAP_MS);
  };

  const outerStyle: CSSProperties = {
    transform: leanTransform,
    willChange: "transform",
    marginRight: `${p.mx * lineH}px`,
    lineHeight: 0,
    cursor: "grab",
    touchAction: "none",
  };
  const wrapStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: `${boxW}px`,
    height: `${h}px`,
    transformOrigin: "center center",
    transform: revealed ? restInner : hiddenInner,
    opacity: revealed ? 1 : 0,
    transition:
      direction === "in"
        ? `transform ${IN_MS}ms ${RISE_EASE} ${idx * STAGGER_MS}ms, opacity ${Math.round(IN_MS * 0.7)}ms ease ${idx * STAGGER_MS}ms, filter ${IN_MS}ms ease ${idx * STAGGER_MS}ms, width ${SWAP_MS}ms ${WIDTH_EASE}`
        : `transform ${OUT_MS}ms cubic-bezier(.4,0,.7,1), opacity ${OUT_MS}ms ease, filter ${OUT_MS}ms ease, width ${SWAP_MS}ms ${WIDTH_EASE}`,
    filter: `${SHADOW} blur(${blurAmt}px)`,
    willChange: "transform, opacity, filter, width",
  };

  const imgBase = (vr: Variant): CSSProperties => ({
    position: "absolute",
    top: "50%",
    left: "50%",
    width: `${aspect(vr)}px`,
    height: `${h}px`,
    transition: `transform ${SWAP_MS}ms ${SLAM_EASE}, opacity ${SWAP_MS}ms ease`,
  });

  return (
    <span
      style={outerStyle}
      data-depth={p.depth ?? 0.5}
      onPointerDown={(e) => {
        e.preventDefault();
      }}
      onClick={(e) => {
        if (e.currentTarget.dataset.dragging) return;
        swap();
      }}
    >
      <span style={wrapStyle}>
        <img
          src={spriteUrl(variant.file)}
          alt={p.ch}
          draggable={false}
          decoding="async"
          className="select-none"
          style={{
            ...imgBase(variant),
            transform: "translate(-50%,-50%)",
            transition: "none",
          }}
        />
        {outgoing && (
          <img
            src={spriteUrl(outgoing.file)}
            alt=""
            aria-hidden
            draggable={false}
            decoding="async"
            className="select-none"
            style={{
              ...imgBase(outgoing),
              animation: `ransom-swap-out ${SWAP_MS}ms ${SLAM_EASE} both`,
            }}
          />
        )}
      </span>
    </span>
  );
}

export function SlammingLine(props: Omit<Parameters<typeof RansomLine>[0], "revealed">) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return <RansomLine {...props} revealed={revealed} />;
}
