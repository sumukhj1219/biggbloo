"use client";

import React, { useEffect, useRef } from "react";
import { LiquidGlass as LiquidGlassEngine } from "@ybouane/liquidglass";
import { useMobile } from "@/hooks/useMobile";
import { useFluidScale } from "@/hooks/useFluidScale";

const LiquidGlass = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const isCompact = useMobile();
  const scale = useFluidScale(410, 576, 1, 176 / 150);

  useEffect(() => {
    if (!rootRef.current || !glassRef.current) return;

    const glass = glassRef.current;

    glass.dataset.config = JSON.stringify({
      blurAmount: 0,
      refraction: 0.4,
      chromAberration: 0.3,
      edgeHighlight: 0.43,
      specular: 0.1,
      fresnel: 2,
      cornerRadius: 24,
      zRadius: 18,
      opacity: 1,
      distortion: 0.2,
      shadowOpacity: 0.355,
      brightness: -0.11
    });

    let instance: LiquidGlassEngine | undefined;

    LiquidGlassEngine.init({
      root: rootRef.current,
      glassElements: [glass],
    }).then((result) => {
      instance = result;
    });

    return () => {
      instance?.destroy();
    };
  }, [isCompact]);

  return (
    <div
      ref={rootRef}
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
      className={`relative overflow-visible sm:size-44 ${
        isCompact ? "aspect-square w-[calc(50%-10px)]" : "size-[150px]"
      }`}
    >
      <video
        src="/app/video.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 size-full object-cover rounded-3xl ring-4 ring-secondary sm:rounded-3xl sm:ring-8"
      />

      <div
        ref={glassRef}
        className={`
          absolute
          left-1/2
          top-1/2
          -translate-x-1/2
          -translate-y-1/2
          rounded-2xl
          sm:h-44
          sm:w-44
          sm:rounded-3xl
          ${isCompact ? "h-full w-full" : "h-[150px] w-[150px]"}
        `}
      >
      </div>
    </div>
  );
};

export default LiquidGlass;
