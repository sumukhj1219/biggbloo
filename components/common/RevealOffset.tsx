"use client";

import { usePathname } from "next/navigation";
import { RevealOffsetContext } from "./Reveal";

// On the home page everything waits for the avatar intro (see SelfIntro),
// except the avatar itself, which reveals with `first`.
const HOME_INTRO_S = 0.9;

const RevealOffset = ({ children }: { children: React.ReactNode }) => (
  <RevealOffsetContext.Provider value={usePathname() === "/" ? HOME_INTRO_S : 0}>{children}</RevealOffsetContext.Provider>
);

export default RevealOffset;
