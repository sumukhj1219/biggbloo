"use client";

import { motion } from "motion/react";
import SelectFrame from "@/components/ui/SelectFrame";

const links = [
  { label: "X", href: "https://x.com/biggbloo" },
  { label: "GitHub", href: "https://github.com/sumukhj1219" },
];

const Footer = () => (
  <footer className="pt-12 pb-12 sm:pt-16">
    <div className="flex items-center justify-between gap-x-4 border-t pt-6 text-xs text-muted-foreground/60 sm:text-sm">
      <span>© {new Date().getFullYear()} Sumukh</span>
      <ul className="flex items-center gap-x-2">
        {links.map(({ label, href }) => (
          <li key={href}>
            <motion.a
              href={href}
              target="_blank"
              rel="noreferrer"
              initial="rest"
              animate="rest"
              whileHover="hover"
              className="press relative block px-2 py-1 hover:text-foreground"
            >
              <SelectFrame />
              {label}
            </motion.a>
          </li>
        ))}
      </ul>
    </div>
  </footer>
);

export default Footer;
