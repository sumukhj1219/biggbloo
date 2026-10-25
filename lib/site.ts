const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE = {
  url: siteUrl.replace(/\/$/, ""),
  name: "Sumukh",
  title: "Sumukh: creative developer",
  description:
    "Sumukh is a 22-year-old developer from India who builds pixel-perfect UIs, games and backends, and sweats the small details.",
  locale: "en_US",
  x: { handle: "@biggbloo", url: "https://x.com/biggbloo" },
  github: "https://github.com/sumukhj1219",
  location: "India",
  keywords: [
    "Sumukh",
    "biggbloo",
    "creative developer",
    "frontend developer",
    "UI engineer",
    "game developer",
    "backend developer",
    "Next.js",
    "React",
    "Three.js",
    "India",
  ],
  projects: [
    {
      title: "Claude Sprites",
      description: "Interactive Claude mascots in the browser.",
      url: "https://claudespritez.fun",
    },
  ],
} as const;

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
