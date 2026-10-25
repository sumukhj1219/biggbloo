"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import HoverChecker from "@/components/ui/HoverChecker";
import type { Writing } from "@/lib/writings";

const MotionLink = motion.create(Link);

const WritingsList = ({
  writings,
}: {
  writings: Writing[];
}) => {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!writings.length) {
    return (
      <p className="text-sm text-muted-foreground/60 sm:text-base">
        Nothing here yet. Soon.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {writings.map(({ slug, title, description, readingMinutes }) => {
        const isBlurred = hovered !== null && hovered !== slug;
        return (
          <motion.li
            key={slug}
            animate={{
              filter: isBlurred ? "blur(3px)" : "blur(0px)",
              opacity: isBlurred ? 0.5 : 1,
            }}
            transition={{ duration: 0.3 }}
            className="border-b border-dashed last:border-b-0"
          >
            <MotionLink
              href={`/writings/${slug}`}
              onMouseEnter={() => setHovered(slug)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(slug)}
              onBlur={() => setHovered(null)}
              initial="rest"
              animate="rest"
              whileHover="hover"
              whileFocus="hover"
              className="flex flex-col gap-y-1.5 py-4"
            >
              <span className="flex items-center text-base text-foreground sm:text-lg">
                <HoverChecker fill="text-pink-300" className="mr-2 h-[1em] w-[0.75em]" />
                <span className="min-w-0 flex-1">{title}</span>
                <span className="ml-4 shrink-0 text-xs text-muted-foreground/60 sm:text-sm">
                  {readingMinutes} min read
                </span>
              </span>
              <span className="text-sm text-muted-foreground/60">{description}</span>
            </MotionLink>
          </motion.li>
        );
      })}
    </ul>
  );
};

export default WritingsList;
