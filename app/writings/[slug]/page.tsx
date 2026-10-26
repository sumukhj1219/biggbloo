import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/common/Container";
import Reveal from "@/components/common/Reveal";
import JsonLd from "@/components/common/JsonLd";
import MarkdownActions from "@/layouts/writings/MarkdownActions";
import SelectionFocus from "@/layouts/writings/SelectionFocus";
import HighlightRestorer from "@/layouts/writings/HighlightRestorer";
import { SITE, absoluteUrl } from "@/lib/site";
import { formatDate, getMarkdown, getSlugs, getWriting, hasWriting } from "@/lib/writings";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/writings/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  if (!(await hasWriting(slug))) notFound();
  const { writing } = await getWriting(slug);
  const url = `/writings/${slug}`;
  return {
    title: writing.title,
    description: writing.description,
    alternates: {
      canonical: url,
      types: { "text/markdown": `${url}.md` },
    },
    openGraph: {
      type: "article",
      title: writing.title,
      description: writing.description,
      url,
      publishedTime: writing.date,
      authors: [SITE.url],
    },
    twitter: {
      card: "summary_large_image",
      title: writing.title,
      description: writing.description,
    },
  };
}

export default async function WritingPage(
  props: PageProps<"/writings/[slug]">,
) {
  const { slug } = await props.params;
  if (!(await hasWriting(slug))) notFound();
  const [{ writing, Content }, markdown] = await Promise.all([
    getWriting(slug),
    getMarkdown(slug),
  ]);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: writing.title,
    description: writing.description,
    datePublished: writing.date,
    url: absoluteUrl(`/writings/${slug}`),
    mainEntityOfPage: absoluteUrl(`/writings/${slug}`),
    image: absoluteUrl(`/writings/${slug}/opengraph-image`),
    author: { "@type": "Person", name: SITE.name, url: SITE.url },
    timeRequired: `PT${writing.readingMinutes}M`,
    inLanguage: "en",
  };

  return (
    <Container>
      <JsonLd data={articleJsonLd} />
      <SelectionFocus className="flex flex-col">
        <Reveal index={1}>
          <Link
              href="/writings"
            className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            ← All blogs
          </Link>
        </Reveal>

        <Reveal index={2} className="mt-8 flex flex-col">
          <h1
              className="text-[22px] leading-tight font-medium tracking-tight text-balance text-foreground sm:text-2xl"
          >
            {writing.title}
          </h1>
          <p
              className="mt-2 text-[15px] leading-relaxed text-pretty text-neutral-500"
          >
            {writing.description}
          </p>
          <div
              className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-5"
          >
            <p className="text-[13px] text-neutral-400">
              {formatDate(writing.date)} · {writing.readingMinutes} min read
            </p>
            <MarkdownActions slug={slug} markdown={markdown} />
          </div>
        </Reveal>

        <Reveal index={3}>
          <article data-highlightable className="mt-8 text-[15px] leading-[1.7] text-pretty text-neutral-600 sm:text-base [&>:first-child]:mt-0">
            <Content />
          </article>
          <HighlightRestorer />
        </Reveal>
      </SelectionFocus>
    </Container>
  );
}
