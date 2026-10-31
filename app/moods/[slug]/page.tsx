import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/common/Container";
import Reveal from "@/components/common/Reveal";
import JsonLd from "@/components/common/JsonLd";
import CopySkill from "@/layouts/effects/CopySkill";
import EffectCode from "@/layouts/effects/EffectCode";
import EffectPlayground from "@/layouts/effects/EffectPlayground";
import { EFFECTS, effectFile, effectHref, effectName, effectSkillHref, isEffect } from "@/lib/effects";
import { SITE, absoluteUrl } from "@/lib/site";
import { getSkill, getSource, highlight, skillSummary } from "@/lib/effects-source";

export const dynamicParams = false;

export function generateStaticParams() {
  return EFFECTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/moods/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  if (!isEffect(slug)) notFound();
  const title = `${effectName(slug)} · React text effect`;
  const description = skillSummary(await getSkill(slug));
  const url = effectHref(slug);
  return {
    title,
    description,
    keywords: [effectName(slug), "text effect", "React", "Motion", "Next.js", "animation", "Claude skill"],
    alternates: { canonical: url, types: { "text/markdown": effectSkillHref(slug) } },
    openGraph: { type: "article", title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function EffectPage(props: PageProps<"/moods/[slug]">) {
  const { slug } = await props.params;
  if (!isEffect(slug)) notFound();
  const [skill, source] = await Promise.all([getSkill(slug), getSource(slug)]);
  const code = await highlight(source);
  const url = absoluteUrl(effectHref(slug));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareSourceCode",
        name: effectName(slug),
        description: skillSummary(skill),
        url,
        image: absoluteUrl(`${effectHref(slug)}/opengraph-image`),
        programmingLanguage: "TypeScript",
        runtimePlatform: "React",
        codeSampleType: "full solution",
        author: { "@type": "Person", name: SITE.name, url: SITE.url },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Moods", item: absoluteUrl("/#moods") },
          { "@type": "ListItem", position: 3, name: effectName(slug), item: url },
        ],
      },
    ],
  };

  return (
    <Container className="flex flex-col">
      <JsonLd data={jsonLd} />
      <Reveal index={1}>
        <Link href="/#moods" className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground">
          ← All moods
        </Link>
      </Reveal>

      <Reveal index={2} className="mt-8 flex flex-col">
        <h1 className="text-[22px] leading-tight font-medium tracking-tight text-balance text-foreground sm:text-2xl">
          {effectName(slug)}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-pretty text-neutral-500">{skillSummary(skill)}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-5">
          <p className="text-[13px] text-neutral-400">React · Motion</p>
          <CopySkill skill={skill} />
        </div>
      </Reveal>

      <Reveal index={3} className="mt-8">
        <EffectPlayground slug={slug} />
      </Reveal>

      <Reveal index={4} className="mt-12">
        <h2 className="text-lg leading-snug font-medium tracking-tight text-foreground">{effectFile(slug)}</h2>
        <EffectCode html={code} />
      </Reveal>
    </Container>
  );
}
