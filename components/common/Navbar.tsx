"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { amatic } from "@/lib/fonts";
import { isMuted, setMuted } from "@/lib/sounds";
import HoverChecker from "@/components/ui/HoverChecker";
import DitherBackground from "@/components/ui/DitherBackground";

const MotionLink = motion.create(Link);

const RockScene = dynamic(() => import("@/components/three/RockScene"), { ssr: false });

const links = [
  { label: "Home", href: "/", bg: "bg-green-400", fill: "text-green-400" },
  { label: "Blogs", href: "/writings", bg: "bg-pink-400", fill: "text-pink-400" },
  { label: "Moods", href: "/#moods", bg: "bg-amber-400", fill: "text-amber-400" },
];

const Navbar = () => {
  const pathname = usePathname();
  const [magic, setMagic] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const toggleSound = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };
  const finishClose = useCallback(() => {
    setClosing(false);
    setMagic(false);
  }, []);

  useEffect(() => {
    if (!magic) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setClosing(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [magic]);

  return (
    <nav aria-label="Main" className="mb-24 sm:mb-30">
      <div className="flex items-center justify-between">
        <ul className="isolate flex flex-wrap items-center gap-x-5 gap-y-1 text-sm sm:text-lg">
          {links.map(({ label, href, bg, fill }) => {
            const isActive =
              href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href);
            return (
              <li key={href}>
                <MotionLink
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  className={cn(
                    "press relative flex items-stretch hover:text-foreground",
                    isActive ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-0 -z-10 shadow-[inset_0_0_6px_0px_var(--color-background)]",
                      bg,
                    )}
                  />
                  <HoverChecker fill={fill} className="w-[1.3125rem] sm:w-[1.6875rem]" />
                  <span className="px-2 py-1">{label}</span>
                </MotionLink>
              </li>
            );
          })}
        </ul>
        <motion.button
          type="button"
          onClick={() => setMagic(true)}
          aria-pressed={magic}
          initial="rest"
          animate="rest"
          whileHover="hover"
          className="press relative isolate flex cursor-pointer items-stretch text-sm text-muted-foreground/60 hover:text-foreground sm:text-lg"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-orange-400 shadow-[inset_0_0_6px_0px_var(--color-background)]"
          />
          <span className="px-2 py-1">Magic</span>
          <HoverChecker fill="text-orange-400" className="w-[1.3125rem] sm:w-[1.6875rem]" />
        </motion.button>
      </div>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {magic && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-0 z-50 bg-linear-to-b from-sky-300 via-sky-100 to-white"
              >
                <DitherBackground className="absolute inset-0 h-full w-full" />
                <RockScene closing={closing} onClosed={finishClose} />
                <div
                  className={cn(
                    amatic.className,
                    "pointer-events-none absolute inset-x-0 top-0 mx-auto flex max-w-5xl flex-col items-end px-4 pt-4 text-2xl sm:px-6 sm:pt-6 sm:text-3xl",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setClosing(true)}
                    disabled={closing}
                    aria-label="Close 3D view"
                    className="press pointer-events-auto cursor-pointer px-2 py-1 text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={toggleSound}
                    aria-pressed={!muted}
                    aria-label={muted ? "Turn sound on" : "Turn sound off"}
                    className={cn(
                      "press pointer-events-auto cursor-pointer px-2 py-1 text-muted-foreground hover:text-foreground",
                      muted && "line-through decoration-2",
                    )}
                  >
                    Sound
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </nav>
  );
};

export default Navbar;
