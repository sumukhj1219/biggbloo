import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import CodeBlock from "@/components/ui/CodeBlock";

const components: MDXComponents = {
  h2: (props) => (
    <h2
      className="mt-12 mb-1 text-lg leading-snug font-medium tracking-tight text-balance text-foreground sm:text-xl"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="mt-9 mb-1 text-base leading-snug font-medium text-foreground sm:text-[17px]" {...props} />
  ),
  p: (props) => <p className="mt-4" {...props} />,
  a: ({ href = "", ...props }) => (
    <Link
      href={href}
      className="underline decoration-neutral-300 decoration-1 underline-offset-4 transition-colors hover:decoration-current"
      {...(href.startsWith("http") && { target: "_blank", rel: "noreferrer" })}
      {...props}
    />
  ),
  strong: (props) => <strong className="font-medium text-foreground" {...props} />,
  ul: (props) => <ul className="mt-4 list-disc space-y-0.5 pl-5 marker:text-neutral-300" {...props} />,
  ol: (props) => <ol className="mt-4 list-decimal space-y-0.5 pl-5 marker:text-neutral-400" {...props} />,
  li: (props) => <li className="pl-1 [&>input]:mr-2 [&>input]:align-middle" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-7 rounded-xl border border-neutral-200 bg-neutral-50/60 px-5 py-3 italic [&>p]:mt-0"
      {...props}
    />
  ),
  code: ({ className, ...props }) =>
    "data-language" in props ? (
      <code className={className} {...props} />
    ) : (
      <code
        className="rounded-[5px] bg-neutral-100 px-[0.35em] py-[0.15em] font-mono text-[0.85em] text-neutral-800 [box-decoration-break:clone]"
        {...props}
      />
    ),
  pre: (props) => <CodeBlock {...props} />,
  figure: (props) => <figure className="m-0" {...props} />,
  table: (props) => (
    <div className="my-7 overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full border-collapse text-left text-[0.92em]" {...props} />
    </div>
  ),
  th: (props) => <th className="border-b border-neutral-200 bg-neutral-50/60 px-4 py-2 font-medium text-foreground" {...props} />,
  td: (props) => <td className="border-t border-neutral-100 px-4 py-2 align-top" {...props} />,
  img: ({ alt = "", ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} className="my-7 w-full rounded-xl border border-neutral-200" {...props} />
  ),
  hr: () => <hr className="my-12 border-neutral-200" />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
