"use client";

import { ReactLenis } from "lenis/react";

// Eases page scrolling so it glides to a stop instead of snapping. Lenis drops the smoothing
// on its own for visitors with prefers-reduced-motion.
const SmoothScroll = ({ children }: { children: React.ReactNode }) => (
  <ReactLenis root options={{ lerp: 0.08, anchors: true, stopInertiaOnNavigate: true }}>
    {children}
  </ReactLenis>
);

export default SmoothScroll;
