"use client";

import React from "react";
import { motion } from "motion/react";
import { pageContainer } from "@/lib/motion";
import { moodboardItems } from "./moodboardItems";
import MoodboardCard from "./MoodboardCard";

const MoodboardGrid = () => {
  return (
    <motion.div
      variants={pageContainer}
      initial="hidden"
      animate="show"
      className="w-full bg-background columns-2 gap-2 sm:columns-3 lg:columns-4 xl:columns-5"
    >
      {moodboardItems.map((item) => (
        <MoodboardCard key={item.id} item={item} />
      ))}
    </motion.div>
  );
};

export default MoodboardGrid;
