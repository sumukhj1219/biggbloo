"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
    <path d="m5 12 5 5L20 7" />
  </svg>
);

// Each shiki `.line` gets a green "+n" gutter, like added lines in a diff. It's
// generated content, so copying the code leaves the numbers out.
const LINE_NUMBERS =
  "[counter-reset:line] [&_.line]:[counter-increment:line] [&_.line]:before:mr-2 [&_.line]:before:inline-block [&_.line]:before:w-12 [&_.line]:before:text-left [&_.line]:before:text-green-600 [&_.line]:before:select-none [&_.line]:before:content-['+'_counter(line)]";

const EffectCode = ({ html }: { html: string }) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(preRef.current?.textContent ?? "").catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="relative mt-4 bg-neutral-50">
      <pre
        ref={preRef}
        data-lenis-prevent
        className={`max-h-[520px] overflow-auto py-8 pr-6 pl-2 text-[13px] leading-[1.7] [&>code]:text-[1em] ${LINE_NUMBERS}`}
      >
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_28px_14px_var(--color-background)]"
      />
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute top-4 right-4 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-neutral-200/60 hover:text-foreground"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "copied" : "copy"}
            className="flex"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15, ease: EASE }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
};

export default EffectCode;
