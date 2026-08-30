"use client";

import { antonio } from "@/lib/fonts";
import React, { useEffect, useState } from "react";

const ClockFace = () => {
  const [now, setNow] = useState(new Date());

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

  const [hours, minutes] = time.split(":");

  const date = now.toLocaleDateString("en-US", {
    month: "long",
    weekday: "short",
    day: "numeric",
  });

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-y-0.5 sm:gap-y-2">
      <span className="whitespace-nowrap text-[16px] leading-none sm:text-xl">
        {date}
      </span>

      <span
        className={`${antonio.className} whitespace-nowrap text-6xl leading-none tracking-tighter text-[#E9D927] sm:text-7xl`}
      >
        {hours}:<span className="text-primary/50">{minutes}</span>
      </span>
    </div>
  );
};

export default ClockFace;
