import Image from "next/image";

const items = [
  {
    id: 1,
    title: "Claude Sprites",
    desc: "Interactive claude mascots in browser.",
    url: "https://claudespritez.fun",
    preview: "/works/spritez/preview.png",
    covers: [
      "/works/spritez/og.png"
    ]
  },
]

// No hover effects beyond the pointer: the cover stays as is and the name sits below it.
const WorkItems = () => (
  <div className="grid grid-cols-2 gap-3 sm:gap-6">
    {items.map((item) => (
      <a
        key={item.id}
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="press flex cursor-pointer flex-col gap-y-2 [--press:0.985]"
      >
        {/* White border like a print; the hairline ring keeps it visible on the white page. */}
        <span className="relative block aspect-[4/3] overflow-hidden rounded-xl border-[3px] border-white sm:rounded-2xl sm:border-4 bg-secondary ring-1 ring-neutral-200">
          <Image
            src={item.covers[0]}
            alt=""
            fill
            sizes="(min-width: 640px) 336px, 50vw"
            className="object-cover scale-[1.15]"
          />
        </span>
        <span className="text-sm text-foreground sm:text-base">{item.title}</span>
      </a>
    ))}
  </div>
);

export default WorkItems;
