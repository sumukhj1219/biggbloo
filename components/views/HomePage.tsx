"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Container from "../layout/Container";
import NowPlaying from "../home/NowPlaying";
import India from "../svgs/India";
import Contact from "../home/Contact";
import FlipCard from "../home/FlipCard";
import LiquidGlass from "../home/LiquidGlass";
import FootballScore from "../home/FootballScore";
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
      className="max-w-xl w-full sm:h-[calc(60vh-4rem)] md:h-[calc(95vh-4rem)] mt-16 flex flex-col justify-center gap-1 mx-auto px-4 sm:px-0 text-xs sm:text-lg font-bold tracking-tight"
    >
      <motion.div variants={pageItem}>
        <span className="text-secondary text-sm sm:text-xl">yo, </span>
        <span className="text-black bg-white  rounded-lg px-2 py-0 inline-block">it&apos;s sumukh </span>
      </motion.div>

      <motion.div variants={pageItem}>
        <span className="text-secondary text-sm sm:text-xl">I spend most of my time on - </span>
        <span className="text-black bg-white rounded-lg px-2 py-0 inline-block relative overflow-hidden align-bottom lowercase">
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
        <span className="text-black bg-white rounded-lg px-2 py-0 flex items-center gap-2 w-fit">
          bengaluru, india <India />
        </span>
      </motion.div>

      <StickerPeel
        imageSrc="/app/logo.jpg"
        width={isMobileLayout ? 40 : 50}
        rotate={12}
        peelBackHoverPct={30}
        peelBackActivePct={40}
        shadowIntensity={0.25}
        lightingIntensity={0.01}
        initialPosition={
          isCompact
            ? { x: 220, y: -400 }
            : isMobileLayout
              ? { x: 300, y: -350 }
              : { x: 480, y: -350 }
        }
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
        <div className="my-4 relative overflow-hidden rounded-3xl aspect-square w-[calc(50%-10px)] sm:aspect-auto sm:w-64 sm:h-48">
          <img className="absolute inset-0 size-full object-cover" src="/app/sit.jpeg" alt="sit" />
        </div>
      </motion.div>

      <motion.div
        variants={pageItem}
        className="my-3 flex flex-wrap items-center justify-between sm:justify-start gap-y-4 sm:gap-x-10 sm:flex-nowrap"
      >
        <div className="flex w-full shrink-0 flex-col sm:w-32">
          <span className="text-black bg-white rounded-lg px-2 py-0 w-fit">reach out :)</span>
          <Contact />
        </div>
        <FlipCard />
        <LiquidGlass />
      </motion.div>

      <motion.div variants={pageItem} className="sm:mx-3">
        <FootballScore />
      </motion.div>
    </MotionContainer>
  );
};

export default HomePage;
