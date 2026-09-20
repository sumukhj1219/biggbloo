import Container from "@/components/common/Container";
import React from "react";
import SelfIntro from "./SelfIntro";
import Work from "./Work";
import CurrentMusic from "./CurrentMusic";
import FootballCard from "@/components/ui/FootballCard";
import Experiments from "./Experiments";
import Reveal from "@/components/common/Reveal";

const HomePage = () => {
  return (
    <Container className="flex flex-col gap-y-8 sm:gap-y-10">
      <Reveal index={1}>
        <SelfIntro />
      </Reveal>
      <Reveal index={2}>
        <CurrentMusic />
      </Reveal>
      <Reveal index={3}>
        <Work />
      </Reveal>
      {/*<FootballCard />*/}
      <Reveal index={4}>
        <Experiments />
      </Reveal>
    </Container>
  );
};

export default HomePage;
