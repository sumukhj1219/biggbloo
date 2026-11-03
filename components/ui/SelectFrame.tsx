"use client";

import { motion } from "motion/react";

// Figma-style selection frame: a blue outline with square handles centred on
// each corner. Driven by the parent's "rest" / "hover" variants, so it shows
// on hover and can be held open by animating the parent to "hover".

const EASE = [0.23, 1, 0.32, 1] as const;

const frame = {
  rest: { opacity: 0, scale: 1.08 },
  hover: { opacity: 1, scale: 1 },
};

const CORNERS = [
  "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
  "top-0 right-0 translate-x-1/2 -translate-y-1/2",
  "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
  "right-0 bottom-0 translate-x-1/2 translate-y-1/2",
];

const SelectFrame = () => (
  <motion.span
    aria-hidden="true"
    variants={frame}
    transition={{ duration: 0.18, ease: EASE }}
    className="pointer-events-none absolute inset-0 outline outline-sky-500"
  >
    {CORNERS.map((corner) => (
      <span key={corner} className={`absolute size-1.5 border border-sky-500 bg-white ${corner}`} />
    ))}
  </motion.span>
);

export default SelectFrame;
