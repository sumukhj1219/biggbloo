import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getWritings } from "@/lib/writings";
import { EFFECTS, effectHref } from "@/lib/effects";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const writings = await getWritings();
  const latest = writings[0]?.date;
  return [
    { url: absoluteUrl("/"), changeFrequency: "monthly", priority: 1 },
    {
      url: absoluteUrl("/writings"),
      lastModified: latest ? new Date(latest) : undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...writings.map((w) => ({
      url: absoluteUrl(`/writings/${w.slug}`),
      lastModified: new Date(w.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
    ...EFFECTS.map(({ slug }) => ({
      url: absoluteUrl(effectHref(slug)),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
