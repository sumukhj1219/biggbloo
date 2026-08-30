import type { Variants } from "motion/react";

/**
 * Shared page-landing animation. Wrap a page's root in `pageContainer`
 * (initial="hidden" animate="show") and each direct section in
 * `pageItem` to get a consistent staggered fade-up entrance across pages.
 */
export const pageContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const pageItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Same timing as `pageItem`, but opacity-only. Use this on an element whose
 * `transform` is already driven by something else (e.g. GSAP), since
 * animating `y` here would fight over the `transform` property.
 */
export const pageItemFade: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};
