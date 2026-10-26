import { OG_SIZE, renderOg } from "@/lib/og";
import { notFound } from "next/navigation";
import { getSlugs, getWriting, hasWriting } from "@/lib/writings";

export const alt = "Blog post";
export const size = OG_SIZE;
export const contentType = "image/png";

export async function generateStaticParams() {
  return (await getSlugs()).map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await hasWriting(slug))) notFound();
  const { writing } = await getWriting(slug);
  return renderOg({ title: writing.title, subtitle: writing.description });
}
