export const EFFECTS = [
  { slug: "distort-effect", width: 570, height: 520 },
  { slug: "text-around-box", width: 408, height: 406 },
  { slug: "announcement-text", width: 638, height: 391 },
  { slug: "size-cascade", width: 443, height: 475 },
  { slug: "retro-text", width: 564, height: 328 },
  { slug: "liquid-morph", width: 818, height: 454 },
  { slug: "acid-blur", width: 354, height: 379 },
  { slug: "metallic-glow", width: 428, height: 315 },
  { slug: "paint-drip", width: 343, height: 510 },
  { slug: "rumble-flash", width: 960, height: 600 },
  { slug: "stitched-text", width: 604, height: 346 },
  { slug: "humans-doodle", width: 728, height: 735 },
  { slug: "magnify-link", width: 585, height: 355, file: "MagnifyGlass.tsx" },
  { slug: "text-tear", width: 798, height: 763 },
] as const;

export type EffectSlug = (typeof EFFECTS)[number]["slug"];

const words = (slug: string) => slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1));

export const effectName = (slug: string) => words(slug).join(" ");
// The component file is named after the slug unless the entry says otherwise.
export const effectFile = (slug: string) => {
  const entry = EFFECTS.find((e) => e.slug === slug);
  return entry && "file" in entry ? entry.file : `${words(slug).join("")}.tsx`;
};
export const effectVideo = (slug: string) => `/moodboard/${slug}.webm`;
export const effectHref = (slug: string) => `/moods/${slug}`;
export const effectSkillHref = (slug: string) => `/moods/${slug}/SKILL.md`;
export const isEffect = (slug: string): slug is EffectSlug => EFFECTS.some((e) => e.slug === slug);
