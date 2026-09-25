"use client";

import React, { useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import { useChildRects } from "@/hooks/useChildRects";
import { useLayoutStore, FADE_DURATION_S } from "@/store/useLayoutStore";

const links = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/work" },
  { label: "Gallery", href: "/gallery" },
  { label: "Projects", href: "/projects" },
];

const Navbar = () => {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const refs = useMemo(() => ({ navbar: navRef }), []);
  useChildRects(refs);

  // `active`/`fading` only ever flip from the home page's 3D toggle — on
  // every other route they stay false, so this is a no-op there.
  const active = useLayoutStore((state) => state.active);
  const fading = useLayoutStore((state) => state.fading);

  return (
    <motion.nav
      ref={navRef}
      aria-label="Main"
      className={cn("mb-8 sm:mb-10", active ? "invisible" : "")}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: fading ? FADE_DURATION_S : 0 }}
    >
      <div className="flex items-center justify-between">
        <ul className="flex flex-wrap items-center  gap-x-5 gap-y-1 text-sm sm:text-lg">
          {links.map(({ label, href }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "transition-colors hover:text-foreground",
                    isActive ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <ThemeToggle />
      </div>
    </motion.nav>
  );
};

export default Navbar;
