"use client";

import Container from "@/components/common/Container";
import SelfIntro from "./SelfIntro";
import CurrentMusic from "./CurrentMusic";
import Reveal from "@/components/common/Reveal";
import Main from "../3d/Main";
import { useRef, useMemo } from "react";
import { motion } from "motion/react";
import { useElementRect } from "@/hooks/useElementRect";
import { useChildRects } from "@/hooks/useChildRects";
import { useLayoutStore, FADE_DURATION_S } from "@/store/useLayoutStore";
import WorkContent from "../works/WorkContent";
import FoosballGame from "@/components/foosball/FoosballGame";

const HomePage = () => {
  const active = useLayoutStore((state) => state.active);
  const fading = useLayoutStore((state) => state.fading);

  const selfIntroRef = useRef<HTMLDivElement>(null);
  const currentMusicRef = useRef<HTMLDivElement>(null);
  const workRef = useRef<HTMLDivElement>(null);
  const foosballRef = useRef<HTMLDivElement>(null);
  const refs = useMemo(
    () => ({ selfIntro: selfIntroRef, currentMusic: currentMusicRef, foosball: foosballRef }),
    [],
  );
  useElementRect(refs);
  const childRectRefs = useMemo(
    () => ({
      selfIntro: selfIntroRef,
      currentMusic: currentMusicRef,
      work: workRef,
      foosball: foosballRef,
    }),
    [],
  );
  useChildRects(childRectRefs);

  return (
    <Container className="flex flex-col gap-y-8 sm:gap-y-10">
      <motion.div
        className={active ? "invisible" : ""}
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: fading ? FADE_DURATION_S : 0 }}
      >
        <Reveal index={1}>
          <SelfIntro ref={selfIntroRef} />
        </Reveal>
      </motion.div>
      <motion.div
        className={active ? "invisible" : ""}
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: fading ? FADE_DURATION_S : 0 }}
      >
        <Reveal index={2}>
          <CurrentMusic ref={currentMusicRef} />
        </Reveal>
      </motion.div>
        <Main />
      {/*<FootballCard />*/}
      <motion.div
        className={active ? "invisible" : ""}
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: fading ? FADE_DURATION_S : 0 }}
      >
        <Reveal index={4}>
          <WorkContent ref={workRef} />
        </Reveal>
      </motion.div>
      <motion.div
        className={active ? "invisible" : ""}
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: fading ? FADE_DURATION_S : 0 }}
      >
        <Reveal index={5}>
          <FoosballGame ref={foosballRef} />
        </Reveal>
      </motion.div>
    </Container>
  );
};

export default HomePage;
