"use client";

import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface SmoothScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wheel/trackpad/touch-driven, spring-eased scroll for a region that sits
 * inside a fixed, non-scrolling page (this is what lets the gallery scroll
 * at all). Wheel input drives it on desktop; pointer drag (covers touch)
 * drives it everywhere else, so it works the same way on mobile.
 */
const SmoothScrollArea = ({ children, className }: SmoothScrollAreaProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTarget = useMotionValue(0);
  const smoothY = useSpring(scrollTarget, { damping: 32, stiffness: 220, mass: 0.6 });
  const y = useTransform(smoothY, (v) => -v);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    // content.offsetTop accounts for any leading offset before it (e.g. a
    // padding-top on `viewport`, used elsewhere to let content slide up
    // under a fixed navbar) - without it, maxScroll comes up short by
    // exactly that offset and the last row never becomes reachable.
    const maxScroll = () =>
      Math.max(0, content.offsetTop + content.scrollHeight - viewport.clientHeight);

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = Math.min(Math.max(scrollTarget.get() + e.deltaY, 0), maxScroll());
      scrollTarget.set(next);
    };

    let isPointerDown = false;
    let lastY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      lastY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const delta = lastY - e.clientY;
      lastY = e.clientY;
      const next = Math.min(Math.max(scrollTarget.get() + delta, 0), maxScroll());
      scrollTarget.set(next);
    };

    const handlePointerUp = () => {
      isPointerDown = false;
    };

    const clamp = () => scrollTarget.set(Math.min(scrollTarget.get(), maxScroll()));

    const resizeObserver = new ResizeObserver(clamp);
    resizeObserver.observe(content);

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("pointerdown", handlePointerDown);
    viewport.addEventListener("pointermove", handlePointerMove);
    viewport.addEventListener("pointerup", handlePointerUp);
    viewport.addEventListener("pointercancel", handlePointerUp);
    viewport.addEventListener("pointerleave", handlePointerUp);

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener("pointerdown", handlePointerDown);
      viewport.removeEventListener("pointermove", handlePointerMove);
      viewport.removeEventListener("pointerup", handlePointerUp);
      viewport.removeEventListener("pointercancel", handlePointerUp);
      viewport.removeEventListener("pointerleave", handlePointerUp);
      resizeObserver.disconnect();
    };
  }, [scrollTarget]);

  return (
    <div ref={viewportRef} className={`relative touch-none overflow-hidden ${className ?? ""}`}>
      <motion.div ref={contentRef} style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
};

export default SmoothScrollArea;
