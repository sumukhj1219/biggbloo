import { OG_SIZE, renderOg } from "@/lib/og";
import { notFound } from "next/navigation";
import { EFFECTS, effectName, isEffect } from "@/lib/effects";

export const alt = "Text effect";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return EFFECTS.map(({ slug }) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isEffect(slug)) notFound();
  return renderOg({ title: effectName(slug) });
}
