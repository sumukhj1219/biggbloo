import { notFound } from "next/navigation";
import { EFFECTS, isEffect } from "@/lib/effects";
import { getSkill } from "@/lib/effects-source";

export const dynamicParams = false;

export function generateStaticParams() {
  return EFFECTS.map(({ slug }) => ({ slug }));
}

export async function GET(_request: Request, ctx: RouteContext<"/moods/[slug]/skill">) {
  const { slug } = await ctx.params;
  if (!isEffect(slug)) notFound();
  return new Response(await getSkill(slug), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
