"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const CHECKER_COLS = 3;
const CHECKER_ROWS = 4;

const EASE = { duration: 0.35, ease: [0.22, 1, 0.36, 1] } as const;

const wrapperVariants = {
  rest: { maxWidth: 0 },
  hover: { maxWidth: 48 },
};

const svgVariants = {
  rest: { x: "-100%", opacity: 0 },
  hover: { x: 0, opacity: 1 },
};

// Full-height checker strip that slides in on the left. The parent must be a
// motion element with `initial="rest" animate="rest" whileHover="hover"` and
// `flex items-stretch`, so the variants propagate and the strip fills its height.
// `fill` is the text-* color class; `className` sets the svg width, which should
// be the parent's height * 3/4 to keep the cells square.
const HoverChecker = ({ fill, className }: { fill: string; className: string }) => (
  <motion.span
    aria-hidden="true"
    variants={wrapperVariants}
    transition={EASE}
    className="flex shrink-0 overflow-hidden"
  >
    <motion.svg
      variants={svgVariants}
      transition={EASE}
      viewBox={`0 0 ${CHECKER_COLS} ${CHECKER_ROWS}`}
      preserveAspectRatio="none"
      className={cn("block h-full shrink-0", fill, className)}
    >
      <rect width={CHECKER_COLS} height={CHECKER_ROWS} fill="white" />
      {Array.from({ length: CHECKER_COLS * CHECKER_ROWS }, (_, i) => {
        const x = i % CHECKER_COLS;
        const y = Math.floor(i / CHECKER_COLS);
        if ((x + y) % 2 !== 0) return null;
        return <rect key={i} x={x} y={y} width={1} height={1} fill="currentColor" />;
      })}
    </motion.svg>
  </motion.span>
);

export default HoverChecker;
