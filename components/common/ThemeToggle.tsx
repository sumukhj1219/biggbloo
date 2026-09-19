"use client";

import React from "react";
import DarkLight from "@/icons/DarkLight";

const ThemeToggle = () => {
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="ml-auto rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
    >
      <DarkLight width={16} height={16} />
    </button>
  );
};

export default ThemeToggle;
