"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { timePages } from "./time-pages";

const AUTO_ADVANCE_MS = 10000;

const TEAR_INITIAL = { x: "100%", opacity: 0 };
const TEAR_ANIMATE = { x: 0, opacity: 1 };
const TEAR_EXIT = { x: "-100%", rotate: -15, opacity: 0 };
const TEAR_TRANSITION = { duration: 0.55, ease: [0.36, 0, 0.66, -0.56] as const };

const FlipCard = () => {
  const [pageIndex, setPageIndex] = useState(0);

  const goToNextPage = () => {
    setPageIndex((prev) => (prev + 1) % timePages.length);
  };

  // Auto-advance after a period of no interaction; any click (via
  // goToNextPage) restarts this timer since pageIndex changes.
  useEffect(() => {
    const timeout = setTimeout(goToNextPage, AUTO_ADVANCE_MS);
    return () => clearTimeout(timeout);
  }, [pageIndex]);

  const ActivePage = timePages[pageIndex];

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-[#FE01D8] cursor-grabbing p-1 ring-4 ring-pink-400/90 aspect-square w-[calc(50%-10px)] sm:aspect-auto sm:size-44 sm:rounded-3xl sm:p-1.5 sm:ring-8"
      onClick={goToNextPage}
    >
      <AnimatePresence>
        <motion.div
          key={pageIndex}
          initial={TEAR_INITIAL}
          animate={TEAR_ANIMATE}
          exit={TEAR_EXIT}
          transition={TEAR_TRANSITION}
          className="absolute inset-0 z-10 h-full w-full"
        >
          <ActivePage />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FlipCard;
