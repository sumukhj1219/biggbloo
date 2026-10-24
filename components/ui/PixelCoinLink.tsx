"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { playCoin } from "@/lib/sounds";
import { PixelSprite, steps } from "./pixel";

// 8x8 coin: K outline, Y face, L highlight, O shade.
const COIN = [
  "..KKKK..",
  ".KYYYYK.",
  "KYLYYYOK",
  "KYLKKYOK",
  "KYLYYYOK",
  "KYYYYOOK",
  ".KOOOOK.",
  "..KKKK..",
];
const COIN_COLORS: Record<string, string> = {
  K: "#92400e",
  Y: "#fcd34d",
  L: "#fef9c3",
  O: "#f59e0b",
};

const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  return { x: Math.round(Math.cos(angle) * 22), y: Math.round(Math.sin(angle) * 14) };
});

const PixelCoin = () => (
  <PixelSprite rows={COIN} colors={COIN_COLORS} className="block size-4 sm:size-5" />
);

const PixelCoinLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const [coins, setCoins] = useState(0);
  const reduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLSpanElement>();

  const collect = () => {
    setCoins((n) => n + 1);
    playCoin();
    if (!reduceMotion) animate(scope.current, { y: [0, -4, 0] }, { duration: 0.2, ease: steps(3) });
  };

  return (
    <span className="relative inline-block">
      <span ref={scope} className="inline-block">
        <Link
          href={href}
          onMouseEnter={collect}
          onFocus={collect}
          className="italic underline  hover:text-primary"
        >
          {children}
        </Link>
      </span>

      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2">
        <AnimatePresence>
          {coins > 0 && (
            <motion.span
              key={coins}
              className="absolute bottom-0 left-0 flex -translate-x-1/2 flex-col items-center"
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 1, 0] }}
              transition={{ duration: 0.9, times: [0, 0.7, 1], ease: steps(6) }}
            >
              <motion.span
                className="font-mono text-[10px] font-bold text-amber-500 [text-shadow:1px_1px_0_#92400e]"
                initial={{ y: 4 }}
                animate={{ y: reduceMotion ? 0 : -10 }}
                transition={{ duration: 0.6, ease: steps(5) }}
              >
                x{coins}
              </motion.span>
              <motion.span
                initial={{ y: 8, scaleX: 1 }}
                animate={
                  reduceMotion
                    ? { y: 0 }
                    : { y: [8, -14, -6], scaleX: [1, 0.2, 1, 0.2, 1] }
                }
                transition={{ duration: 0.6, ease: steps(8) }}
              >
                <PixelCoin />
              </motion.span>
              {!reduceMotion &&
                SPARKS.map(({ x, y }, i) => (
                  <motion.span
                    key={i}
                    className="absolute bottom-1 size-[3px] bg-amber-400"
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{ x, y: y - 6, opacity: 0 }}
                    transition={{ duration: 0.45, delay: 0.1, ease: steps(4) }}
                  />
                ))}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </span>
  );
};

export default PixelCoinLink;
