import { SITE, absoluteUrl } from "@/lib/site";
import { getMarkdown, getWritings } from "@/lib/writings";

const header = () => `# ${SITE.name}

> ${SITE.description}

${SITE.name} (${SITE.x.handle} on X) is a creative developer based in ${SITE.location}. This site is a
portfolio with a blog. Every blog post is also available as plain Markdown by adding \`.md\` to its URL.

## About

- Name: ${SITE.name}
- Based in: ${SITE.location}
- Builds: pixel-perfect UIs, games and backends
- Home page: ${absoluteUrl("/")}

## Projects

${SITE.projects.map((p) => `- [${p.title}](${p.url}): ${p.description}`).join("\n")}
`;

const links = () => `## Links

- [X / Twitter](${SITE.x.url}): ${SITE.x.handle}
- [GitHub](${SITE.github})
- [Blog index](${absoluteUrl("/writings")})
- [RSS feed](${absoluteUrl("/writings/rss.xml")})
- [Sitemap](${absoluteUrl("/sitemap.xml")})
`;

const demoteHeadings = (md: string) => {
  let inFence = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
      return !inFence && /^#{1,5} /.test(line) ? `#${line}` : line;
    })
    .join("\n");
};

export const llmsTxt = async () => {
  const writings = await getWritings();
  const posts = writings
    .map((w) => `- [${w.title}](${absoluteUrl(`/writings/${w.slug}.md`)}): ${w.description} (${w.date})`)
    .join("\n");
  return `${header()}
## Blog posts

${posts || "- None yet."}

${links()}
## Optional

- [Full text](${absoluteUrl("/llms-full.txt")}): every blog post in one file
`;
};

export const llmsFullTxt = async () => {
  const writings = await getWritings();
  const posts = await Promise.all(
    writings.map(async (w) => {
      const md = demoteHeadings(await getMarkdown(w.slug));
      return `${md}\nSource: ${absoluteUrl(`/writings/${w.slug}`)} · Published ${w.date}\n`;
    }),
  );
  return `${header()}
${links()}
## Blog posts

${posts.join("\n---\n\n") || "None yet."}`;
};
