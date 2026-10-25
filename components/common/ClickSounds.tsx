"use client";

import { useEffect } from "react";
import { getSound } from "@/lib/sounds";

const INTERACTIVE =
  'a[href], button, [role="button"], [role="menuitem"], [role="tab"], summary, label, select, input[type="checkbox"], input[type="radio"], mark[data-hl]';

const ClickSounds = () => {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (!target || target.closest("[data-no-click-sound]")) return;
      if (target.matches(":disabled, [aria-disabled='true']")) return;
      getSound("click").play();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
};

export default ClickSounds;
