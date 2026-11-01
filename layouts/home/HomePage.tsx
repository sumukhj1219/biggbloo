"use client";

import Container from "@/components/common/Container";
import SelfIntro from "./SelfIntro";
import CurrentMusic from "./CurrentMusic";
import Reveal from "@/components/common/Reveal";
import WorkContent from "../works/WorkContent";
import MoodBoard from "../moods/MoodBoard";
import FoosballGame from "@/components/foosball/FoosballGame";
import SpeedLines from "@/components/ui/SpeedLines";

const HomePage = () => {
  return (
    <Container className="flex flex-col gap-y-8 sm:gap-y-10">
      {/* Outside Reveal: a transformed ancestor would break its fixed positioning. */}
      <SpeedLines />
      <Reveal index={1}>
        <SelfIntro />
      </Reveal>
      <Reveal index={2}>
        <CurrentMusic />
      </Reveal>
      <Reveal index={4}>
        <WorkContent />
      </Reveal>
      <Reveal index={5}>
        <MoodBoard />
      </Reveal>
      <Reveal index={6}>
        <FoosballGame />
      </Reveal>
    </Container>
  );
};

export default HomePage;
