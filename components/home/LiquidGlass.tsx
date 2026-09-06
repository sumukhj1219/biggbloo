"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

const IRIS_PADDING = 3;

const Eye = ({
  size,
  pupilSize,
  tilt = 0,
  offsetY = 0,
}: {
  size: number;
  pupilSize: number;
  tilt?: number;
  offsetY?: number;
}) => {
  const eyeRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 350, damping: 22, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 350, damping: 22, mass: 0.4 });
  const [blinking, setBlinking] = useState(false);

  const maxTravel = (size - pupilSize) / 2 - IRIS_PADDING;

  const browGazeY = useTransform(springY, [-maxTravel, maxTravel], [-3, 2]);
  const browRaise = useMotionValue(0);
  const browRaiseSpring = useSpring(browRaise, { stiffness: 260, damping: 16 });
  const browY = useTransform(
    [browGazeY, browRaiseSpring],
    ([gaze, raise]: number[]) => gaze + raise
  );

  useEffect(() => {
    const hasCursor = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (hasCursor) {
      const handleMove = (e: MouseEvent) => {
        const el = eyeRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const angle = Math.atan2(dy, dx);
        const distance = Math.min(Math.hypot(dx, dy) / 6, maxTravel);

        x.set(Math.cos(angle) * distance);
        y.set(Math.sin(angle) * distance);
      };

      window.addEventListener("mousemove", handleMove);
      return () => window.removeEventListener("mousemove", handleMove);
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    const wander = () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * maxTravel;
      x.set(Math.cos(angle) * distance);
      y.set(Math.sin(angle) * distance);
      timeoutId = setTimeout(wander, 700 + Math.random() * 1300);
    };
    wander();
    return () => clearTimeout(timeoutId);
  }, [x, y, maxTravel]);

  useEffect(() => {
    let openTimeoutId: ReturnType<typeof setTimeout>;
    let closeTimeoutId: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      openTimeoutId = setTimeout(() => {
        setBlinking(true);
        closeTimeoutId = setTimeout(() => {
          setBlinking(false);
          scheduleBlink();
        }, 120);
      }, 2000 + Math.random() * 4000);
    };

    scheduleBlink();
    return () => {
      clearTimeout(openTimeoutId);
      clearTimeout(closeTimeoutId);
    };
  }, []);

  useEffect(() => {
    let openId: ReturnType<typeof setTimeout>;
    let closeId: ReturnType<typeof setTimeout>;

    const scheduleRaise = () => {
      openId = setTimeout(() => {
        browRaise.set(-5);
        closeId = setTimeout(() => {
          browRaise.set(0);
          scheduleRaise();
        }, 260);
      }, 3000 + Math.random() * 5000);
    };

    scheduleRaise();
    return () => {
      clearTimeout(openId);
      clearTimeout(closeId);
    };
  }, [browRaise]);

  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{ transform: `translateY(${offsetY}px) rotate(${tilt}deg)` }}
    >
      <motion.div
        className="rounded-full bg-black/80"
        style={{ width: size * 0.85, height: Math.max(3, size * 0.16), y: browY }}
      />
      <motion.div
        ref={eyeRef}
        animate={{ scaleY: blinking ? 0.1 : 1 }}
        transition={{ duration: 0.1, ease: "easeInOut" }}
        className="relative rounded-full bg-white flex items-center justify-center shadow-inner overflow-hidden"
        style={{ width: size, height: size }}
      >
        <motion.div
          className="rounded-full bg-black"
          style={{ width: pupilSize, height: pupilSize, x: springX, y: springY }}
        />
      </motion.div>
    </div>
  );
};

const LiquidGlass = () => {
  return (
    <div className="relative overflow-visible aspect-square w-[calc(50%-10px)] sm:aspect-auto sm:size-44">
      <div className="absolute inset-0 size-full flex flex-col items-center justify-center gap-2 overflow-hidden bg-secondary rounded-3xl ring-4 ring-secondary sm:rounded-3xl sm:ring-8">
        <div className="absolute left-[10%] top-1/2 size-4 -translate-y-1 rounded-full bg-pink-300/50 blur-md sm:size-5" />
        <div className="absolute right-[10%] top-1/2 size-4 -translate-y-1 rounded-full bg-pink-300/50 blur-md sm:size-5" />

        <div className="flex items-end justify-center gap-3">
          <Eye size={44} pupilSize={20} tilt={-6} />
          <Eye size={52} pupilSize={24} tilt={3} offsetY={-4} />
        </div>

        <div className="h-2.5 w-6 rounded-b-full border-b-[3px] border-black/60" />
      </div>
    </div>
  );
};

export default LiquidGlass;
