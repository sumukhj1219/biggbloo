"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import HoverChecker from "@/components/ui/HoverChecker";

const MotionLink = motion.create(Link);

const links = [
  { label: "Home", href: "/", bg: "bg-yellow-300", fill: "text-yellow-300" },
  { label: "Writings", href: "/writings", bg: "bg-pink-300", fill: "text-pink-300" },
];

const Navbar = () => {
  const pathname = usePathname();

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
      </div>
    </nav>
  );
};

export default Navbar;
