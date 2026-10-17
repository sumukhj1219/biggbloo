"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import HoverChecker from "@/components/ui/HoverChecker";
import DitherBackground from "@/components/ui/DitherBackground";

const MotionLink = motion.create(Link);

// three.js is only downloaded once Magic is first clicked.
const RockScene = dynamic(() => import("@/components/three/RockScene"), { ssr: false });

const links = [
  { label: "Home", href: "/", bg: "bg-yellow-300", fill: "text-yellow-300" },
  { label: "Writings", href: "/writings", bg: "bg-pink-300", fill: "text-pink-300" },
];

const Navbar = () => {
  const pathname = usePathname();
  const [magic, setMagic] = useState(false);

  useEffect(() => {
    if (!magic) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMagic(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [magic]);

  return (
    <nav aria-label="Main" className="mb-8 sm:mb-10">
      <div className="flex items-center justify-between">
        <ul className="isolate flex flex-wrap items-center gap-x-5 gap-y-1 text-sm sm:text-lg">
          {links.map(({ label, href, bg, fill }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <MotionLink
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  className={cn(
                    "relative flex items-stretch transition-colors hover:text-foreground",
                    isActive ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-0 -z-10 shadow-[inset_0_0_12px_0px_var(--color-background)]",
                      bg,
                    )}
                  />
                  {/* Link height is 1.75rem / 2.25rem (sm); width = height * 3/4. */}
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
          className="relative isolate flex cursor-pointer items-stretch text-sm text-muted-foreground/60 transition-colors hover:text-foreground sm:text-lg"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-orange-300 shadow-[inset_0_0_12px_0px_var(--color-background)]"
          />
          <HoverChecker fill="text-orange-300" className="w-[1.3125rem] sm:w-[1.6875rem]" />
          <span className="px-2 py-1">Magic</span>
        </motion.button>
      </div>
      {/* Portaled to body: the Reveal wrapper's transform would otherwise trap `fixed`. */}
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
                <RockScene />
                <button
                  type="button"
                  onClick={() => setMagic(false)}
                  aria-label="Close 3D view"
                  className="absolute right-4 top-4 cursor-pointer px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground sm:right-6 sm:top-6 sm:text-lg"
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </nav>
  );
};

export default Navbar;
