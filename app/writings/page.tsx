import type { Metadata } from "next";
import Container from "@/components/common/Container";
import Reveal from "@/components/common/Reveal";
import WritingsList from "@/layouts/writings/WritingsList";
import { getWritings } from "@/lib/writings";

export const metadata: Metadata = {
  title: "Blogs",
  description: "Notes by Sumukh on building UIs, games and backends.",
  alternates: { canonical: "/writings" },
  openGraph: { url: "/writings", title: "Blogs", description: "Notes by Sumukh on building UIs, games and backends." },
};

export default async function WritingsPage() {
  const writings = await getWritings();

  return (
    <Container>
      <Reveal index={1}>
        <WritingsList writings={writings} />
      </Reveal>
    </Container>
  );
}
