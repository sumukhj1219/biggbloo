import fs from "node:fs/promises";
import path from "node:path";
import type { ComponentType } from "react";

const DIR = path.join(process.cwd(), "content/writings");
const WORDS_PER_MINUTE = 220;

export interface WritingMeta {
  title: string;
  description: string;
  date: string;
}

export interface Writing extends WritingMeta {
  slug: string;
  readingMinutes: number;
}

type WritingModule = { default: ComponentType; metadata: WritingMeta };

const loadModule = (slug: string): Promise<WritingModule> =>
  import(`@/content/writings/${slug}.mdx`);

const readSource = (slug: string) => fs.readFile(path.join(DIR, `${slug}.mdx`), "utf8");

const readingMinutes = async (slug: string) => {
  const source = await readSource(slug);
  const words = source.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
};

export const getSlugs = async () =>
  (await fs.readdir(DIR)).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));

export const getWriting = async (slug: string) => {
  const [{ default: Content, metadata }, minutes] = await Promise.all([
    loadModule(slug),
    readingMinutes(slug),
  ]);
  const writing: Writing = { ...metadata, slug, readingMinutes: minutes };
  return { writing, Content };
};

export const getMarkdown = async (slug: string) => {
  const [{ writing }, source] = await Promise.all([getWriting(slug), readSource(slug)]);
  const body = source
    .replace(/^\s*export const metadata = \{[\s\S]*?\n\};?\s*/, "")
    .replace(/^import .*\n/gm, "")
    .trim();
  return `# ${writing.title}\n\n> ${writing.description}\n\n${body}\n`;
};

export const getWritings = async (): Promise<Writing[]> => {
  const all = await Promise.all((await getSlugs()).map(async (slug) => (await getWriting(slug)).writing));
  return all.sort((a, b) => b.date.localeCompare(a.date));
};

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
