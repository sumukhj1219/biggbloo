"use client";

import React, { createContext, forwardRef, useContext } from "react";
import { motion, useReducedMotion } from "motion/react";

interface RevealProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  /** Ignore the page's intro offset and reveal straight away. */
  first?: boolean;
}

// Seconds every Reveal on the page waits before its own stagger.
export const RevealOffsetContext = createContext(0);

const STAGGER_S = 0.09;

const Reveal = forwardRef<HTMLDivElement, RevealProps>(
  ({ children, index = 0, className, first = false }, ref) => {
    const reduceMotion = useReducedMotion();
    const offset = useContext(RevealOffsetContext);

    return (
      <motion.div
        ref={ref}
        className={className}
        // Starts blurred and comes into focus. The filter is cleared afterwards:
        // a leftover blur(0px) would still trap fixed children and z-index.
        initial={reduceMotion ? false : { opacity: 0, y: 18, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
        transition={{
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1],
          delay: (first ? 0 : offset) + index * STAGGER_S,
        }}
      >
        {children}
      </motion.div>
    );
  },
);
Reveal.displayName = "Reveal";

export default Reveal;
