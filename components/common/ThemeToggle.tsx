"use client";

import React from "react";
import LightBulb from "@/icons/LightBulb";

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
      className="ml-auto rounded-md text-muted-foreground transition-colors  hover:text-accent-foreground cursor-pointer"
    >
      <LightBulb width={16} height={16} />
    </button>
  );
};

export default ThemeToggle;
