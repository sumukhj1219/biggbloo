import { SITE, absoluteUrl } from "@/lib/site";
import { getWritings } from "@/lib/writings";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const writings = await getWritings();
  const items = writings
    .map((w) => {
      const url = absoluteUrl(`/writings/${w.slug}`);
      return `    <item>
      <title>${escape(w.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escape(w.description)}</description>
      <pubDate>${new Date(`${w.date}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(`${SITE.name}'s blog`)}</title>
    <link>${absoluteUrl("/writings")}</link>
    <description>${escape("Notes on building UIs, games and backends.")}</description>
    <language>en</language>
    <atom:link href="${absoluteUrl("/writings/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
