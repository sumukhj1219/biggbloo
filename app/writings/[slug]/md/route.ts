import { notFound } from "next/navigation";
import { getMarkdown, getSlugs, hasWriting } from "@/lib/writings";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getSlugs()).map((slug) => ({ slug }));
}

export async function GET(_request: Request, ctx: RouteContext<"/writings/[slug]/md">) {
  const { slug } = await ctx.params;
  if (!(await hasWriting(slug))) notFound();
  return new Response(await getMarkdown(slug), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
