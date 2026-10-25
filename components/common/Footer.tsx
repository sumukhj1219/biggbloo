"use client";

import { motion } from "motion/react";
import HoverChecker from "@/components/ui/HoverChecker";

const links = [
  {
    label: "X",
    href: "https://x.com/biggbloo",
    bg: "bg-lime-300",
    fill: "text-lime-300",
  },
  {
    label: "GitHub",
    href: "https://github.com/sumukhj1219",
    bg: "bg-violet-300",
    fill: "text-violet-300",
  },
];

const Footer = () => (
  <footer className="mt-auto pt-12 pb-12 sm:pt-16">
    <div className="flex items-center justify-between gap-x-4 border-t pt-6 text-xs text-muted-foreground/60 sm:text-sm">
      <span>© {new Date().getFullYear()} Sumukh</span>
      <ul className="isolate flex items-center gap-x-4">
        {links.map(({ label, href, bg, fill }) => (
          <li key={href}>
            <motion.a
              href={href}
              target="_blank"
              rel="noreferrer"
              initial="rest"
              animate="rest"
              whileHover="hover"
              className="relative flex items-stretch transition-colors hover:text-foreground"
            >
              <span
                aria-hidden="true"
                className={`absolute inset-0 -z-10 shadow-[inset_0_0_12px_0px_var(--color-background)] ${bg}`}
              />
              <HoverChecker fill={fill} className="w-[1.125rem] sm:w-6" />
              <span className="px-2 py-1">{label}</span>
            </motion.a>
          </li>
        ))}
      </ul>
    </div>
  </footer>
);

export default Footer;
