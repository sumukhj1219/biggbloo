"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
    <path d="m5 12 5 5L20 7" />
  </svg>
);

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const MarkdownActions = ({ slug, markdown }: { slug: string; markdown: string }) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const copy = async () => {
    await navigator.clipboard.writeText(markdown).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const mdUrl = () => `${window.location.origin}/writings/${slug}.md`;
  const prompt = () => `Read ${mdUrl()} so I can ask questions about it.`;
  const items = [
    { label: "View as Markdown", href: () => mdUrl() },
    { label: "Open in ChatGPT", href: () => `https://chatgpt.com/?q=${encodeURIComponent(prompt())}` },
    { label: "Open in Claude", href: () => `https://claude.ai/new?q=${encodeURIComponent(prompt())}` },
  ];

  return (
    <div ref={rootRef} className="relative flex w-fit items-center rounded-full bg-secondary p-0.5 text-[11px] text-muted-foreground">
      <button
        type="button"
        onClick={copy}
        className="flex h-6 cursor-pointer items-center gap-x-1 rounded-full px-2 transition-colors hover:bg-background hover:text-foreground"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "copied" : "copy"}
            className="flex items-center gap-x-1"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: EASE }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy Markdown"}
          </motion.span>
        </AnimatePresence>
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More Markdown options"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-background hover:text-foreground"
      >
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2, ease: EASE }} className="flex">
          <Chevron />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, scale: 0.96, filter: "blur(4px)" }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute top-full right-0 z-30 mt-2 flex min-w-44 origin-top-right flex-col rounded-2xl bg-background p-1 shadow-[0_2px_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)]"
          >
            {items.map(({ label, href }) => (
              <a
                key={label}
                role="menuitem"
                href={`/writings/${slug}.md`}
                onClick={(e) => {
                  e.preventDefault();
                  window.open(href(), "_blank", "noopener,noreferrer");
                  setOpen(false);
                }}
                className="rounded-xl px-3 py-1.5 transition-colors hover:bg-secondary hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarkdownActions;
