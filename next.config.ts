import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  transpilePackages: ["three"],
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.dev",
    "*.ngrok.io",
  ],

  async rewrites() {
    return [{ source: "/writings/:slug.md", destination: "/writings/:slug/md" }];
  },

  async headers() {
    return [
      {
        source: "/experiments/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lastfm-img.freetls.fastly.net" },
      { protocol: "https", hostname: "lastfm.freetls.fastly.net" },
      { protocol: "https", hostname: "pbs.twimg.com" },
    ],
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [["rehype-pretty-code", { theme: "github-light", keepBackground: false }]],
  },
});

export default withMDX(nextConfig);
