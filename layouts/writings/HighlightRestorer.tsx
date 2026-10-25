"use client";

import { useEffect } from "react";
import { restoreHighlights } from "@/lib/highlights";

const HighlightRestorer = () => {
  useEffect(() => {
    restoreHighlights();
  }, []);
  return null;
};

export default HighlightRestorer;
