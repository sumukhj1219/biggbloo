"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ControlField, type Values } from "@/components/ui/Controls";
import type { EffectSlug } from "@/lib/effects";
import { PLAYGROUNDS } from "./playgrounds";

const defaults = (slug: EffectSlug): Values =>
  Object.fromEntries(PLAYGROUNDS[slug].controls.map((c) => [c.key, c.value]));

const ReplayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const stageButton =
  "flex h-7 cursor-pointer items-center gap-x-1.5 rounded-full bg-background/80 px-2.5 text-[11px] text-neutral-600 shadow-[0_1px_3px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground";

const EffectPlayground = ({ slug }: { slug: EffectSlug }) => {
  const { controls, render } = PLAYGROUNDS[slug];
  const [values, setValues] = useState(() => defaults(slug));
  const [run, setRun] = useState(0);
  const [spin, setSpin] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  const replay = () => {
    setRun((r) => r + 1);
    setSpin((r) => r - 360);
  };
  const reset = () => {
    setValues(defaults(slug));
    setRun((r) => r + 1);
  };

  return (
    <div className="flex flex-col gap-y-4">
      <div
        ref={stageRef}
        className="relative isolate flex h-[360px] items-center justify-center overflow-hidden rounded-2xl sm:h-[440px]"
        style={{
          background: values.background as string | undefined,
          color: values.color as string | undefined,
        }}
      >
        <div key={run} className="flex size-full items-center justify-center">
          {render(values, stageRef)}
        </div>
        <div className="absolute top-3 right-3 z-10 flex gap-x-1.5">
          <button type="button" onClick={reset} className={stageButton}>
            Reset
          </button>
          <button type="button" onClick={replay} className={stageButton} aria-label="Replay animation">
            <motion.span className="flex" animate={{ rotate: spin }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <ReplayIcon />
            </motion.span>
            Replay
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {controls.map((control) => (
          <ControlField
            key={control.key}
            control={control}
            value={values[control.key]}
            onChange={(value) => setValues((prev) => ({ ...prev, [control.key]: value }))}
          />
        ))}
      </div>
    </div>
  );
};

export default EffectPlayground;
