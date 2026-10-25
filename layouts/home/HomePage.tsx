"use client";

import Container from "@/components/common/Container";
import SelfIntro from "./SelfIntro";
import CurrentMusic from "./CurrentMusic";
import Reveal from "@/components/common/Reveal";
import WorkContent from "../works/WorkContent";
import FoosballGame from "@/components/foosball/FoosballGame";

const HomePage = () => {
  return (
    <Container className="flex flex-col gap-y-8 sm:gap-y-10">
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
        <FoosballGame />
      </Reveal>
    </Container>
  );
};

export default HomePage;
