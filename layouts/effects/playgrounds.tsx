"use client";

import type { ReactNode, RefObject } from "react";
import dynamic from "next/dynamic";
import type { Control, Values } from "@/components/ui/Controls";
import type { EffectSlug } from "@/lib/effects";

// Each effect is its own chunk, so a page only downloads the effect it shows.
const DistortStack = dynamic(() => import("@/text-effects/distort-effect/assets/DistortEffect").then((m) => m.DistortStack));
const TextAroundBox = dynamic(() => import("@/text-effects/text-around-box/assets/TextAroundBox").then((m) => m.TextAroundBox));
const AnnouncementText = dynamic(() =>
  import("@/text-effects/announcement-text/assets/AnnouncementText").then((m) => m.AnnouncementText),
);
const SizeCascade = dynamic(() => import("@/text-effects/size-cascade/assets/SizeCascade").then((m) => m.SizeCascade));
const RetroText = dynamic(() => import("@/text-effects/retro-text/assets/RetroText").then((m) => m.RetroText));
const LiquidMorph = dynamic(() => import("@/text-effects/liquid-morph/assets/LiquidMorph").then((m) => m.LiquidMorph));
const AcidBlur = dynamic(() => import("@/text-effects/acid-blur/assets/AcidBlur").then((m) => m.AcidBlur));
const MetallicGlow = dynamic(() => import("@/text-effects/metallic-glow/assets/MetallicGlow").then((m) => m.MetallicGlow));
const PaintDrip = dynamic(() => import("@/text-effects/paint-drip/assets/PaintDrip").then((m) => m.PaintDrip));
const RumbleFlash = dynamic(() => import("@/text-effects/rumble-flash/assets/RumbleFlash").then((m) => m.RumbleFlash));
const StitchedText = dynamic(() => import("@/text-effects/stitched-text/assets/StitchedText").then((m) => m.StitchedText));

type Playground = {
  // `background` and `color` controls style the preview stage itself.
  controls: Control[];
  render: (v: Values, stage: RefObject<HTMLDivElement | null>) => ReactNode;
};

const ANTON = "font-(family-name:--font-anton)";

const range = (key: string, label: string, value: number, min: number, max: number, step: number): Control => ({
  type: "range", key, label, value, min, max, step,
});
const text = (key: string, label: string, value: string): Control => ({ type: "text", key, label, value });
const color = (key: string, label: string, value: string): Control => ({ type: "color", key, label, value });
const select = (key: string, label: string, options: readonly string[], value: string): Control => ({
  type: "select", key, label, options, value,
});
const toggle = (key: string, label: string, value: boolean): Control => ({ type: "toggle", key, label, value });

// Gradient ramps are arrays, so the playground offers presets instead of one picker per stop.
const GLOW_RAMPS: Record<string, string[]> = {
  molten: ["#1a0300", "#6e1200", "#c42d00", "#ff5a00", "#ff8a1f", "#ffc27a", "#fff1dc", "#ffffff"],
  ice: ["#000814", "#002a5c", "#0057b8", "#1e90ff", "#5cc8ff", "#bfeaff", "#ffffff"],
  toxic: ["#020a00", "#0d3b00", "#2e8a00", "#5cff1a", "#b0ff7a", "#eaffd6", "#ffffff"],
};
const DRIP_RAMPS: Record<string, string[]> = {
  ink: ["#2a2a2a", "#4a4a4a", "#6a6a6a", "#7a7a7a", "#5c5c5c", "#3a3a3a", "#202020", "#101010"],
  sunset: ["#fff3a0", "#ffcc1a", "#ff8c00", "#ff4500", "#e0112b", "#8a1a7a", "#3a1f8a", "#1a1660"],
  candy: ["#ffd1f0", "#ff9ad8", "#ff6ec7", "#b14dff", "#4dd2ff", "#2a6bff"],
};

const n = (v: Values, key: string) => v[key] as number;
const s = (v: Values, key: string) => v[key] as string;
const b = (v: Values, key: string) => v[key] as boolean;

export const PLAYGROUNDS: Record<EffectSlug, Playground> = {
  "distort-effect": {
    controls: [
      text("line1", "Top line", "DIS"),
      text("line2", "Bottom line", "RESPECT"),
      color("color", "Color", "#ff0000"),
      color("background", "Background", "#ffffff"),
      range("ratio", "Ratio", 2.2, 1, 2.9, 0.1),
      range("duration", "Duration", 0.4, 0.1, 1.5, 0.05),
      range("gap", "Gap", 0.12, 0, 0.5, 0.01),
    ],
    render: (v) => (
      <DistortStack
        lines={[s(v, "line1"), s(v, "line2")].filter(Boolean)}
        ratio={n(v, "ratio")}
        duration={n(v, "duration")}
        gap={n(v, "gap")}
        className="text-5xl font-extrabold sm:text-7xl"
      />
    ),
  },
  "text-around-box": {
    controls: [
      text("text", "Text", "GOAL"),
      color("color", "Color", "#6d28d9"),
      color("background", "Background", "#ffffff"),
      range("speed", "Speed", 3, 0.5, 10, 0.5),
      range("perspective", "Perspective", 0.5, 0.2, 1.5, 0.05),
      range("depth", "Depth", 2.5, 1, 5, 0.1),
      range("rowGap", "Row gap", 0.85, 0.5, 1.5, 0.05),
      range("rotateSpeed", "Spin speed", 30, -120, 120, 5),
      range("bands", "Bands", 3, 1, 6, 1),
      range("rowsPerBand", "Rows per band", 1, 1, 5, 1),
    ],
    render: (v) => (
      <TextAroundBox
        text={s(v, "text")}
        mode="loop"
        height="100%"
        speed={n(v, "speed")}
        perspective={n(v, "perspective")}
        depth={n(v, "depth")}
        rowGap={n(v, "rowGap")}
        rotateSpeed={n(v, "rotateSpeed")}
        bands={n(v, "bands")}
        rowsPerBand={n(v, "rowsPerBand")}
        className="size-full font-black"
      />
    ),
  },
  "announcement-text": {
    controls: [
      text("line1", "Top line", "Visca el"),
      text("line2", "Bottom line", "Barça"),
      color("cardColor", "Cards", "#dc1f5a"),
      color("textColor", "Letters", "#ffd23f"),
      color("background", "Background", "#2e2d78"),
      select("trigger", "Trigger", ["auto", "hover"], "auto"),
      range("maxScale", "Max scale", 1.5, 1, 2.5, 0.05),
      range("minScale", "Min scale", 0.7, 0.3, 1, 0.05),
      range("duration", "Duration", 0.35, 0.1, 1, 0.05),
      range("stagger", "Stagger", 0, 0, 0.3, 0.01),
      range("hold", "Hold", 0.5, 0, 2, 0.1),
      range("pause", "Pause", 0.8, 0, 3, 0.1),
      range("gap", "Gap", 0.05, 0, 0.3, 0.01),
      range("radius", "Radius", 0, 0, 0.4, 0.01),
    ],
    render: (v) => (
      <AnnouncementText
        lines={[s(v, "line1"), s(v, "line2")]}
        cardColor={s(v, "cardColor")}
        textColor={s(v, "textColor")}
        trigger={s(v, "trigger") as "auto" | "hover"}
        maxScale={n(v, "maxScale")}
        minScale={n(v, "minScale")}
        duration={n(v, "duration")}
        stagger={n(v, "stagger")}
        hold={n(v, "hold")}
        pause={n(v, "pause")}
        gap={n(v, "gap")}
        radius={n(v, "radius")}
        className="text-4xl font-black sm:text-6xl"
      />
    ),
  },
  "size-cascade": {
    controls: [
      text("text", "Text", "Replay"),
      color("color", "Color", "#1414e6"),
      color("background", "Background", "#ffffff"),
      select("trigger", "Trigger", ["auto", "hover"], "auto"),
      range("rows", "Rows", 9, 3, 15, 1),
      range("minScale", "Min scale", 0.3, 0.1, 0.9, 0.05),
      range("gap", "Gap", 0.06, 0, 0.3, 0.01),
      range("duration", "Duration", 1, 0.2, 3, 0.1),
      range("hold", "Hold", 0.6, 0, 2, 0.1),
    ],
    render: (v) => (
      <SizeCascade
        text={s(v, "text")}
        trigger={s(v, "trigger") as "auto" | "hover"}
        rows={n(v, "rows")}
        minScale={n(v, "minScale")}
        gap={n(v, "gap")}
        duration={n(v, "duration")}
        hold={n(v, "hold")}
        className="text-4xl font-normal tracking-tight sm:text-5xl"
      />
    ),
  },
  "retro-text": {
    controls: [
      text("text", "Text", "RETRO"),
      color("fillColor", "Fill", "#f4a81d"),
      color("dotColor", "Dots", "#b5123f"),
      color("outlineColor", "Outline", "#fdebd3"),
      color("shadowColor", "Shadow", "#2b0812"),
      color("background", "Background", "#e03a3a"),
      range("dotSize", "Dot size", 0.02, 0.005, 0.06, 0.005),
      range("dotSpacing", "Dot spacing", 0.055, 0.02, 0.12, 0.005),
      range("outlineWidth", "Outline width", 0.02, 0, 0.06, 0.005),
      range("depth", "Depth", 0.09, 0, 0.25, 0.01),
      range("angle", "Angle", 45, 0, 360, 5),
      range("letterGap", "Letter gap", 0, -0.05, 0.2, 0.01),
      range("stagger", "Stagger", 0.08, 0, 0.3, 0.01),
      range("duration", "Duration", 0.6, 0.1, 2, 0.05),
      range("rise", "Rise", 0.6, 0, 1.5, 0.05),
    ],
    render: (v) => (
      <RetroText
        text={s(v, "text")}
        fillColor={s(v, "fillColor")}
        dotColor={s(v, "dotColor")}
        outlineColor={s(v, "outlineColor")}
        shadowColor={s(v, "shadowColor")}
        dotSize={n(v, "dotSize")}
        dotSpacing={n(v, "dotSpacing")}
        outlineWidth={n(v, "outlineWidth")}
        depth={n(v, "depth")}
        angle={n(v, "angle")}
        letterGap={n(v, "letterGap")}
        stagger={n(v, "stagger")}
        duration={n(v, "duration")}
        rise={n(v, "rise")}
        className={`text-8xl sm:text-9xl ${ANTON}`}
      />
    ),
  },
  "liquid-morph": {
    controls: [
      text("text", "Text", "FLOAT"),
      color("color", "Outline", "#ffffff"),
      color("fill", "Fill", "none"),
      color("background", "Background", "#1b1b1d"),
      toggle("draggable", "Draggable", true),
      range("strokeWidth", "Stroke", 0.045, 0, 0.12, 0.005),
      range("goo", "Goo", 0.06, 0, 0.15, 0.005),
      range("tracking", "Tracking", -0.04, -0.15, 0.15, 0.01),
      range("neck", "Neck", 0.32, 0.1, 0.6, 0.01),
      range("maxStretch", "Max stretch", 1.1, 0.3, 2.5, 0.05),
    ],
    render: (v, stage) => (
      <LiquidMorph
        text={s(v, "text")}
        color={s(v, "color")}
        fill={s(v, "fill")}
        strokeWidth={n(v, "strokeWidth")}
        goo={n(v, "goo")}
        tracking={n(v, "tracking")}
        neck={n(v, "neck")}
        maxStretch={n(v, "maxStretch")}
        draggable={b(v, "draggable")}
        dragBounds={stage}
        className="text-8xl font-black sm:text-9xl"
      />
    ),
  },
  "acid-blur": {
    controls: [
      text("text", "Text", "CASINO"),
      color("color", "Color", "#ffffff"),
      color("background", "Background", "#17171c"),
      toggle("live", "Live", true),
      range("duration", "Duration", 3, 0.5, 8, 0.1),
      range("delay", "Delay", 0.3, 0, 2, 0.1),
      range("smear", "Smear", 1.1, 0, 3, 0.05),
      range("angle", "Angle", 205, 0, 360, 5),
      range("glow", "Glow", 0.14, 0, 0.4, 0.01),
      range("grain", "Grain", 0.45, 0, 1, 0.05),
    ],
    render: (v) => (
      <AcidBlur
        text={s(v, "text")}
        live={b(v, "live")}
        duration={n(v, "duration")}
        delay={n(v, "delay")}
        smear={n(v, "smear")}
        angle={n(v, "angle")}
        glow={n(v, "glow")}
        grain={n(v, "grain")}
        className={`text-8xl sm:text-9xl ${ANTON}`}
      />
    ),
  },
  "metallic-glow": {
    controls: [
      text("text", "Text", "@$$"),
      select("palette", "Palette", Object.keys(GLOW_RAMPS), "molten"),
      color("glass", "Glass", "#3a404a"),
      color("background", "Background", "#1b1b1d"),
      toggle("live", "Live", true),
      range("speed", "Speed", 1, 0, 4, 0.1),
      range("glow", "Glow", 0.01, 0, 0.4, 0.01),
      range("intensity", "Intensity", 1, 0.2, 2.5, 0.05),
      range("corners", "Corners", 0.1, 0, 2, 0.05),
      range("duration", "Duration", 1.6, 0.2, 5, 0.1),
      range("delay", "Delay", 0.2, 0, 2, 0.1),
    ],
    render: (v) => (
      <MetallicGlow
        text={s(v, "text")}
        colors={GLOW_RAMPS[s(v, "palette")]}
        glass={s(v, "glass")}
        live={b(v, "live")}
        speed={n(v, "speed")}
        glow={n(v, "glow")}
        intensity={n(v, "intensity")}
        corners={n(v, "corners")}
        duration={n(v, "duration")}
        delay={n(v, "delay")}
        className="text-8xl font-black sm:text-9xl"
      />
    ),
  },
  "paint-drip": {
    controls: [
      text("text", "Text", "drip"),
      select("palette", "Palette", Object.keys(DRIP_RAMPS), "ink"),
      color("color", "Letters", "#111111"),
      color("background", "Background", "#ffffff"),
      toggle("live", "Live", true),
      range("length", "Length", 4.6, 0.5, 5, 0.1),
      range("turbulence", "Turbulence", 1, 0, 2, 0.05),
      range("melt", "Melt", 0.85, 0, 2, 0.05),
      range("speed", "Speed", 1, 0, 3, 0.1),
      range("duration", "Duration", 10, 1, 20, 0.5),
      range("delay", "Delay", 1, 0, 3, 0.1),
    ],
    // The drips hang below the text box, so the stage gives them a smaller font.
    render: (v) => (
      <PaintDrip
        text={s(v, "text")}
        colors={DRIP_RAMPS[s(v, "palette")]}
        color={s(v, "color")}
        live={b(v, "live")}
        length={n(v, "length")}
        turbulence={n(v, "turbulence")}
        melt={n(v, "melt")}
        speed={n(v, "speed")}
        duration={n(v, "duration")}
        delay={n(v, "delay")}
        className="text-5xl font-extrabold sm:text-6xl"
      />
    ),
  },
  "rumble-flash": {
    controls: [
      text("text", "Text", "CAN YOU HEAR THE SOUND OF THE NIGHT"),
      color("color", "Ink", "#ffffff"),
      color("background", "Background", "#000000"),
      color("flashColor", "Flash", "#ffffff"),
      toggle("figures", "Figures", true),
      toggle("loop", "Loop", true),
      range("beat", "Beat", 0.32, 0.12, 1, 0.01),
      range("flash", "Flash chance", 0.8, 0, 1, 0.05),
      range("flashDuration", "Flash ms", 50, 20, 200, 10),
      range("rumble", "Rumble", 1, 0, 2, 0.05),
      range("glitch", "Glitch", 0.6, 0, 1, 0.05),
      range("chroma", "Chroma", 0.7, 0, 1, 0.05),
      range("size", "Size", 0.65, 0.3, 1, 0.05),
      range("fps", "FPS", 24, 8, 60, 1),
    ],
    // A 16:10 screen that fills the stage width; it paints its own background.
    render: (v) => (
      <RumbleFlash
        text={s(v, "text")}
        color={s(v, "color")}
        background={s(v, "background")}
        flashColor={s(v, "flashColor")}
        figures={b(v, "figures")}
        loop={b(v, "loop")}
        beat={n(v, "beat")}
        flash={n(v, "flash")}
        flashDuration={n(v, "flashDuration")}
        rumble={n(v, "rumble")}
        glitch={n(v, "glitch")}
        chroma={n(v, "chroma")}
        size={n(v, "size")}
        fps={n(v, "fps")}
        className="w-full"
      />
    ),
  },
  "stitched-text": {
    controls: [
      text("text", "Text", "Barcelona"),
      color("thread1", "Thread 1", "#004d98"),
      color("thread2", "Thread 2", "#a50044"),
      color("borderColor", "Border", "#f2c12e"),
      color("background", "Background", "#ffffff"),
      toggle("needle", "Needle", true),
      toggle("shadow", "Shadow", true),
      range("border", "Border width", 0.07, 0, 0.2, 0.005),
      range("thread", "Thread", 0.013, 0.005, 0.04, 0.001),
      range("slant", "Slant", 28, -80, 80, 1),
      range("duration", "Duration", 3.2, 0, 10, 0.1),
      range("delay", "Delay", 0.2, 0, 2, 0.1),
    ],
    render: (v) => (
      <StitchedText
        text={s(v, "text")}
        colors={[s(v, "thread1"), s(v, "thread2")]}
        borderColor={s(v, "borderColor")}
        needle={b(v, "needle")}
        shadow={b(v, "shadow")}
        border={n(v, "border")}
        thread={n(v, "thread")}
        slant={n(v, "slant")}
        duration={n(v, "duration")}
        delay={n(v, "delay")}
        className="text-6xl font-black sm:text-8xl"
      />
    ),
  },
};
