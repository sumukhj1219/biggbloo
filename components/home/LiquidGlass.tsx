"use client";

import React, { useEffect, useRef } from "react";
import { LiquidGlass as LiquidGlassEngine } from "@ybouane/liquidglass";

const LiquidGlass = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);

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
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative overflow-visible aspect-square w-[calc(50%-10px)] sm:aspect-auto sm:size-44"
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
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl h-full w-full sm:h-44 sm:w-44 sm:rounded-3xl"
      >
      </div>
    </div>
  );
};

export default LiquidGlass;
