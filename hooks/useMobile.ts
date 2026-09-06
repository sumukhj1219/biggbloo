"use client";

import { useEffect, useState } from "react";

export const useMobile = (breakpoint: number = 352) => {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    const update = () => setIsCompact(mql.matches);
    update();

    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);

  return isCompact;
};

export default useMobile;
