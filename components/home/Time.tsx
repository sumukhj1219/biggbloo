"use client";

import { antonio } from "@/lib/fonts";
import { useMobile } from "@/hooks/useMobile";
import { useFluidScale } from "@/hooks/useFluidScale";
import React, { useEffect, useState } from "react";
import {motion} from "motion/react"

const Time = () => {
  const [now, setNow] = useState(new Date());
  const isCompact = useMobile();
  const scale = useFluidScale(410, 576, 1, 176 / 150);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });

  const date = now.toLocaleDateString("en-US", {
    month: "long",
    weekday: "short",
    day: "numeric",
  });

  return (
    <div
      style={
        isCompact
          ? undefined
          : {
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              marginRight: 150 * (scale - 1),
              marginBottom: 150 * (scale - 1),
            }
      }
      className={`relative overflow-hidden rounded-3xl bg-[#FE01D8] cursor-grabbing p-1 ring-4 ring-pink-400/90 sm:size-44 sm:rounded-3xl sm:p-1.5 sm:ring-8 ${
        isCompact ? "aspect-square w-[calc(50%-10px)]" : "size-[150px]"
      }`}
    >
      <div className="relative z-10 flex h-full flex-col gap-y-0.5 items-center justify-center sm:gap-y-2">
        <span className="whitespace-nowrap text-[16px] leading-none sm:text-xl">
          {date}
        </span>

        <motion.span

          className={`${antonio.className} whitespace-nowrap text-6xl leading-none tracking-tighter text-[#E9D927] sm:text-7xl`}
        >
          {time}
        </motion.span>
      </div>
    </div>
  );
};

export default Time;
