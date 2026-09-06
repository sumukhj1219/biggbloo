"use client";

import { fatCat } from "@/lib/fonts";
import React, { useLayoutEffect, useRef, useState } from "react";

const TEXT = "projects";

const Projects = () => {
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    const box = boxRef.current;
    const measure = measureRef.current;
    if (!box || !measure) return;

    const FIT_SCALE = 0.94;

    const fit = () => {
      const { width, height } = box.getBoundingClientRect();
      if (!width || !height) return;

      const targetHeight = height * FIT_SCALE;
      const targetWidth = width * FIT_SCALE;

      measure.style.fontSize = `${targetHeight}px`;
      const textWidth = measure.getBoundingClientRect().width;
      if (!textWidth) return;

      setStyle({
        fontSize: targetHeight,
        transform: `scaleX(${targetWidth / textWidth})`,
        transformOrigin: "left center",
      });
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full my-3 h-36 cursor-pointer overflow-hidden rounded-3xl p-6 bg-[#0406b0] flex items-center relative ring-8 ring-blue-700">
      <div ref={boxRef} className="h-full w-full flex items-center">
        <span
          style={style}
          className={`whitespace-nowrap leading-none text-blue-300 z-10 ${fatCat.className}`}
        >
          {TEXT}
        </span>
        <span
          ref={measureRef}
          aria-hidden
          className={`invisible absolute left-0 top-0 whitespace-nowrap leading-none pointer-events-none ${fatCat.className}`}
        >
          {TEXT}
        </span>
      </div>
    </div>
  );
};

export default Projects;
