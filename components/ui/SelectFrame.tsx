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

// Corners are motion elements so a shared-layout move corrects their scale
// instead of stretching the handles.
const Corners = () =>
  CORNERS.map((corner) => (
    <motion.span key={corner} layout className={`absolute size-1.5 border border-sky-500 bg-white ${corner}`} />
  ));

const OUTLINE = "pointer-events-none absolute inset-0 outline outline-sky-500";

/**
 * Without `layoutId` it follows the parent's hover variants. With one it is a
 * persistent selection that glides to wherever the same id renders next, like
 * a selection moving between layers.
 */
const SelectFrame = ({ layoutId }: { layoutId?: string }) =>
  layoutId ? (
    // Distinct keys: React must remount when a link flips between the two
    // modes, or the old frame keeps its opacity and the glide never starts.
    <motion.span
      key="selected"
      aria-hidden="true"
      layoutId={layoutId}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
      className={OUTLINE}
    >
      <Corners />
    </motion.span>
  ) : (
    <motion.span key="hover" aria-hidden="true" variants={frame} transition={{ duration: 0.18, ease: EASE }} className={OUTLINE}>
      <Corners />
    </motion.span>
  );

export default SelectFrame;
