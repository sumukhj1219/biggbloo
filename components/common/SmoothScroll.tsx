"use client";

import { ReactLenis } from "lenis/react";

const SmoothScroll = ({ children }: { children: React.ReactNode }) => (
  <ReactLenis root options={{ lerp: 0.08, anchors: true, stopInertiaOnNavigate: true }}>
    {children}
  </ReactLenis>
);

export default SmoothScroll;
