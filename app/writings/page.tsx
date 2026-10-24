import type { Metadata } from "next";
import Container from "@/components/common/Container";
import Reveal from "@/components/common/Reveal";
import WritingsList from "@/layouts/writings/WritingsList";
import { formatDate, getWritings } from "@/lib/writings";

export const metadata: Metadata = {
  title: "Blogs",
  description: "Notes on building UIs, games and backends.",
};

export default async function WritingsPage() {
  const writings = await getWritings();
  // Formatted on the server so the client list doesn't depend on the viewer's locale.
  const dates = Object.fromEntries(writings.map((w) => [w.slug, formatDate(w.date)]));

  return (
    <Container>
      <Reveal index={1}>
        <WritingsList writings={writings} dates={dates} />
      </Reveal>
    </Container>
  );
}
