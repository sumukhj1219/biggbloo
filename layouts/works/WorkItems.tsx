"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const items = [
  {
    id: 1,
    title: "Claude Sprites",
    desc: "Interactive claude mascots in browser.",
    url: "https://claudespritez.fun",
    preview: "/works/spritez/preview.png",
    covers: [
      "/works/spritez/og.png"
    ]
  },
]

const WorkItems = () => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {items.map((item) => {
        const isHovered = hoveredId === item.id;
        const isBlurred = hoveredId !== null && !isHovered;

        return (
          <motion.a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.title}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            animate={{
              filter: isBlurred ? "blur(6px)" : "blur(0px)",
              opacity: isBlurred ? 0.5 : 1,
            }}
            transition={{ duration: 0.3 }}
            className="relative block aspect-[4/3] isolate inset-shadow-xs overflow-hidden border-2 bg-secondary cursor-pointer"
          >
            <Image
              src={item.covers[0]}
              alt={item.title}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover scale-[1.15]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 shadow-[inset_0_0_32px_0px_var(--color-background)]"
            />
            <motion.div
              initial={false}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "absolute inset-0 flex flex-col justify-end bg-black/60 p-3",
              )}
            >
              <span className="text-sm text-white">{item.title}</span>
              <span className="text-xs text-white/70">{item.desc}</span>
            </motion.div>
          </motion.a>
        );
      })}
    </div>
  );
};

export default WorkItems;
