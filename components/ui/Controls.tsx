"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type Control =
  | { type: "range"; key: string; label: string; min: number; max: number; step: number; value: number }
  | { type: "text"; key: string; label: string; value: string }
  | { type: "color"; key: string; label: string; value: string }
  | { type: "select"; key: string; label: string; options: readonly string[]; value: string }
  | { type: "toggle"; key: string; label: string; value: boolean };

export type Values = Record<string, string | number | boolean>;

const FIELD =
  "relative flex h-10 items-center overflow-hidden rounded-lg bg-secondary text-[13px] transition-shadow focus-within:ring-2 focus-within:ring-neutral-300";
const LABEL = "relative shrink-0 px-3 text-muted-foreground";

const decimals = (step: number) => (String(step).split(".")[1] ?? "").length;

const Slider = ({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className={cn(FIELD, "cursor-ew-resize select-none")}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-neutral-200/80" style={{ width: `${pct}%` }} />
      <span
        aria-hidden="true"
        className="absolute inset-y-2 w-0.5 -translate-x-1/2 rounded-full bg-neutral-400"
        style={{ left: `clamp(4px, ${pct}%, calc(100% - 4px))` }}
      />
      <span className={LABEL}>{label}</span>
      <span className="relative ml-auto px-3 text-foreground tabular-nums">{value.toFixed(decimals(step))}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </label>
  );
};

const TextField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className={FIELD}>
    <span className={LABEL}>{label}</span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      className="h-full min-w-0 flex-1 bg-transparent pr-3 text-right text-foreground outline-none"
    />
  </label>
);

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const isHex = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className={FIELD}>
      <span className={LABEL}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        spellCheck={false}
        className="h-full min-w-0 flex-1 bg-transparent text-right font-mono text-[12px] text-foreground uppercase outline-none"
      />
      <span
        className="relative mx-2.5 size-5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
        style={{ background: value }}
      >
        <input
          type="color"
          value={isHex ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Pick ${label.toLowerCase()}`}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </span>
    </div>
  );
};

const SelectField = ({ label, options, value, onChange }: { label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) => {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={FIELD}>
      <span className={LABEL}>{label}</span>
      <div className="ml-auto flex h-full items-center gap-0.5 p-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            onClick={() => onChange(option)}
            className="press relative h-full cursor-pointer rounded-md px-2.5 text-muted-foreground aria-checked:text-foreground"
          >
            {value === option && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-md bg-background shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
              />
            )}
            <span className="relative">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    className={cn(FIELD, "press w-full cursor-pointer outline-none [--press:0.98] focus-visible:ring-2 focus-visible:ring-neutral-300")}
  >
    <span className={LABEL}>{label}</span>
    <span
      className={cn(
        "relative mr-2.5 ml-auto flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
        value ? "bg-neutral-800" : "bg-neutral-300",
      )}
    >
      <motion.span
        className="size-4 rounded-full bg-background shadow-sm"
        animate={{ x: value ? 16 : 0 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
      />
    </span>
  </button>
);

export const ControlField = ({ control, value, onChange }: { control: Control; value: Values[string]; onChange: (v: Values[string]) => void }) => {
  switch (control.type) {
    case "range":
      return (
        <Slider
          label={control.label}
          min={control.min}
          max={control.max}
          step={control.step}
          value={value as number}
          onChange={onChange}
        />
      );;
    case "text":
      return <TextField label={control.label} value={value as string} onChange={onChange} />;
    case "color":
      return <ColorField label={control.label} value={value as string} onChange={onChange} />;
    case "select":
      return <SelectField label={control.label} options={control.options} value={value as string} onChange={onChange} />;
    case "toggle":
      return <Toggle label={control.label} value={value as boolean} onChange={onChange} />;
  }
};
