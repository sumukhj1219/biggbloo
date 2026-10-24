import type { MDXComponents } from "mdx/types";
import Link from "next/link";

// Typography for posts in content/writings, in the same voice as the rest of the site.
const components: MDXComponents = {
  h2: (props) => <h2 className="mt-10 mb-3 text-lg text-foreground sm:text-xl" {...props} />,
  h3: (props) => <h3 className="mt-8 mb-2 text-base text-foreground sm:text-lg" {...props} />,
  p: (props) => <p className="my-4" {...props} />,
  a: ({ href = "", ...props }) => (
    <Link
      href={href}
      className="italic underline hover:text-primary"
      {...(href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}
      {...props}
    />
  ),
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  ul: (props) => <ul className="my-4 list-disc space-y-1 pl-5 marker:text-pink-300" {...props} />,
  ol: (props) => <ol className="my-4 list-decimal space-y-1 pl-5 marker:text-pink-400" {...props} />,
  blockquote: (props) => (
    <blockquote className="my-6 border-l-4 border-pink-300 pl-4 text-foreground italic" {...props} />
  ),
  // Inline code; fenced blocks are styled through `pre` below.
  code: (props) => <code className="bg-secondary px-1 py-0.5 font-mono text-[0.85em] text-foreground" {...props} />,
  pre: (props) => (
    <pre
      className="my-6 overflow-x-auto border-2 bg-secondary p-4 text-sm leading-relaxed inset-shadow-xs [&>code]:bg-transparent [&>code]:p-0"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-dashed" />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
