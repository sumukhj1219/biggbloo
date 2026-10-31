import fs from "node:fs/promises";
import path from "node:path";
import { codeToHtml } from "shiki";
import { effectFile } from "@/lib/effects";

const DIR = path.join(process.cwd(), "text-effects");

export const getSkill = (slug: string) => fs.readFile(path.join(DIR, slug, "SKILL.md"), "utf8");

export const getSource = (slug: string) =>
  fs.readFile(path.join(DIR, slug, "assets", effectFile(slug)), "utf8");

// First paragraph under the "# Title" heading as plain text. Some lead into a
// list with a colon, which reads as a full stop on its own.
export const skillSummary = (skill: string) => {
  const body = skill.replace(/^---[\s\S]*?\n---\s*/, "").replace(/^#\s.*\n+/, "");
  return (body.split(/\n\s*\n/)[0] ?? "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/[`*_]/g, "")
    .trim()
    .replace(/:$/, ".");
};

// Same theme as the blog's code blocks; only the inner <code> is kept so the
// shared CodeBlock frame supplies the <pre>.
export const highlight = async (code: string) => {
  const html = await codeToHtml(code, { lang: "tsx", theme: "github-light" });
  return html.match(/<code>([\s\S]*)<\/code>/)?.[1] ?? "";
};
