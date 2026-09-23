"use client";

import Container from "@/components/common/Container";
import SelfIntro from "./SelfIntro";
import CurrentMusic from "./CurrentMusic";
import Reveal from "@/components/common/Reveal";
import Main from "../3d/Main";
import { useState, useRef, useMemo } from "react";
import { useElementRect } from "@/hooks/useElementRect";
import { useChildRects } from "@/hooks/useChildRects";

const HomePage = () => {
  const [active, setActive] = useState<boolean>(false);
  const selfIntroRef = useRef<HTMLDivElement>(null);
  const currentMusicRef = useRef<HTMLDivElement>(null);
  const refs = useMemo(
    () => ({ selfIntro: selfIntroRef, currentMusic: currentMusicRef }),
    [],
  );
  useElementRect(refs);
  const childRectRefs = useMemo(() => ({ selfIntro: selfIntroRef }), []);
  useChildRects(childRectRefs);

  return (
    <Container className="flex flex-col gap-y-8 sm:gap-y-10">
      <Reveal index={1} className={`${active ? "invisible" : ""}`}>
        <SelfIntro ref={selfIntroRef} />
      </Reveal>
      <Reveal index={2} className={`${active ? "invisible" : ""}`}>
        <CurrentMusic ref={currentMusicRef} />
      </Reveal>
      <Reveal index={3}>
        <Main active={active} setActive={setActive} />
      </Reveal>
      {/*<FootballCard />*/}
      {/*<Reveal index={4}>
        <Experiments />
      </Reveal>*/}
    </Container>
  );
};

export default HomePage;
