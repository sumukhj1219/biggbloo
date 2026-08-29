"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Container from "../layout/Container";
import NowPlaying from "../home/NowPlaying";
import India from "../svgs/India";
import Stack from "../home/Stack";
import Contact from "../home/Contact";
import Time from "../home/Time";
import LiquidGlass from "../home/LiquidGlass";
import Projects from "../home/Projects";
import { useMobile } from "@/hooks/useMobile";

const words = [
  "Frontends",
  "ThreeJs",
  "Backends",
  "Building Games",
  "Fitness",
  "blue lock",
];

const HomePage = () => {
  const [index, setIndex] = useState(0);
  const isCompact = useMobile();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Container className="max-w-xl w-full sm:h-[60vh] md:h-[95vh] sm:mt-0 mt-16 flex flex-col justify-center gap-1 mx-auto px-4 sm:px-0 text-sm sm:text-xl font-bold tracking-tight">
      <div>
        <span className="text-secondary">yo, </span>
        <span className="text-primary">it&apos;s sumukh </span>
      </div>

      <div>
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
      </div>

      <div>
        <span className="text-primary flex items-center gap-2">
          bengaluru, india <India />
        </span>
      </div>

      <div className=" flex items-center gap-2">
        <span className="text-secondary">click me</span>
        <span className="size-6 rounded-full shadow">
          <img className="w-full h-full rounded-full" src={"/app/logo.jpg"} alt="sumukh" />
        </span>
      </div>

      <div className="flex items-center justify-between ">
        <NowPlaying />
        <Stack />
      </div>

      <div
        className={`my-3 flex flex-wrap items-center sm:gap-x-10 gap-y-4 sm:flex-nowrap ${
          isCompact ? "gap-x-5" : "gap-x-5"
        }`}
      >
        <div className="flex w-full shrink-0 flex-col sm:w-32">
          <span className="text-primary">reach out :)</span>
          <Contact />
        </div>
        <Time />
        <LiquidGlass />
      </div>

      <div className="sm:mx-3">
        <Projects />
      </div>
    </Container>
  );
};

export default HomePage;
