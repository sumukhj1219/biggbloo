"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import HoverChecker from "@/components/ui/HoverChecker";

// Coloured label with the checker that slides in on hover, as used for section headings.
const SectionTitle = ({
  bg,
  fill,
  children,
}: {
  bg: string;
  fill: string;
  children: React.ReactNode;
}) => (
  <motion.span
    initial="rest"
    animate="rest"
    whileHover="hover"
    className="relative isolate flex w-fit items-stretch text-sm sm:text-lg"
  >
    <span
      aria-hidden="true"
      className={cn("absolute inset-0 -z-10 shadow-[inset_0_0_12px_0px_var(--color-background)]", bg)}
    />
    <HoverChecker fill={fill} className="w-[1.125rem] sm:w-6" />
    <span className="px-2 py-1">{children}</span>
  </motion.span>
);

export default SectionTitle;
