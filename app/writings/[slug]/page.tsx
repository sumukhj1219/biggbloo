import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/common/Container";
import Reveal from "@/components/common/Reveal";
import { formatDate, getSlugs, getWriting } from "@/lib/writings";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/writings/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { writing } = await getWriting(slug);
  return { title: writing.title, description: writing.description };
}

export default async function WritingPage(props: PageProps<"/writings/[slug]">) {
  const { slug } = await props.params;
  const { writing, Content } = await getWriting(slug);

  return (
    <Container className="flex flex-col">
      <Reveal index={1}>
        <Link
          href="/writings"
          className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          ← All blogs
        </Link>
      </Reveal>

      <Reveal index={2} className="mt-6 flex flex-col gap-y-2 border-b border-dashed pb-6">
        <h1 className="text-2xl text-foreground sm:text-3xl">{writing.title}</h1>
        <p className="text-sm text-muted-foreground/60">
          {formatDate(writing.date)} · {writing.readingMinutes} min read
        </p>
      </Reveal>

      <Reveal index={3}>
        <article className="text-[15px] leading-relaxed text-muted-foreground sm:text-base [&_img]:my-6 [&_img]:border-2">
          <Content />
        </article>
      </Reveal>
    </Container>
  );
}
