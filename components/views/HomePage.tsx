"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Container from "../layout/Container";
import NowPlaying from "../home/NowPlaying";
import India from "../svgs/India";
import Stack from "../home/Stack";
import Contact from "../home/Contact";
import FlipCard from "../home/FlipCard";
import LiquidGlass from "../home/LiquidGlass";
import Projects from "../home/Projects";
import { useMobile } from "@/hooks/useMobile";
import { pageContainer, pageItem, pageItemFade } from "@/lib/motion";
import StickerPeel from "@/components/ui/sticker-peel";

const words = [
  "Frontends",
  "ThreeJs",
  "Backends",
  "Building Games",
  "Fitness",
  "blue lock",
];

const MotionContainer = motion.create(Container);

const HomePage = () => {
  const [index, setIndex] = useState(0);
  const isCompact = useMobile();
  // Matches the `sm:` Tailwind breakpoint the rest of this layout switches
  // on, so the sticker's position stays in sync with how everything else reflows.
  const isMobileLayout = useMobile(640);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <MotionContainer
      variants={pageContainer}
      initial="hidden"
      animate="show"
      className="max-w-xl w-full sm:h-[60vh] md:h-[95vh] sm:mt-0 mt-16 flex flex-col justify-center gap-1 mx-auto px-4 sm:px-0 text-sm sm:text-xl font-bold tracking-tight"
    >
      <motion.div variants={pageItem}>
        <span className="text-secondary">yo, </span>
        <span className="text-primary">it&apos;s sumukh </span>
      </motion.div>

      <motion.div variants={pageItem}>
        <span className="text-secondary">I spend most of my time on - </span>
        <span className="text-primary inline-block relative overflow-hidden align-bottom lowercase">
          <AnimatePresence mode="wait">
            <motion.span
              key={words[index]}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="inline-block"
            >
              {words[index]}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.div>

      <motion.div variants={pageItem}>
        <span className="text-primary flex items-center gap-2">
          bengaluru, india <India />
        </span>
      </motion.div>

      <motion.div variants={pageItem} className=" flex items-center gap-2">
        <span className="text-secondary">click me</span>
      </motion.div>

      <StickerPeel
        imageSrc="/app/logo.jpg"
        width={isMobileLayout ? 40 : 50}
        rotate={12}
        peelBackHoverPct={30}
        peelBackActivePct={40}
        shadowIntensity={0.25}
        lightingIntensity={0.01}
        initialPosition={isMobileLayout ? { x: 300, y: -350 } : { x: 480, y: -350 }}
        peelDirection={0}
        draggable={false}
        className="z-30"
        variants={pageItemFade}
      />

      <motion.div
        variants={pageItem}
        className="flex items-center justify-between "
      >
        <NowPlaying />
        <Stack />
      </motion.div>

      <motion.div
        variants={pageItem}
        className={`my-3 flex flex-wrap items-center sm:gap-x-10 gap-y-4 sm:flex-nowrap ${
          isCompact ? "gap-x-5" : "gap-x-5"
        }`}
      >
        <div className="flex w-full shrink-0 flex-col sm:w-32">
          <span className="text-primary">reach out :)</span>
          <Contact />
        </div>
        <FlipCard />
        <LiquidGlass />
      </motion.div>

      <motion.div variants={pageItem} className="sm:mx-3">
        <Projects />
      </motion.div>
    </MotionContainer>
  );
};

export default HomePage;
