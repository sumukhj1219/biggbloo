const edges = [
  { side: "top-0", dir: "to bottom" },
  { side: "bottom-0", dir: "to top" },
] as const;

const ScrollFade = () => (
  <>
    {edges.map(({ side, dir }) => (
      <div
        key={side}
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 ${side} z-40 h-16 backdrop-blur-[2px] sm:h-24`}
        style={{
          background: `linear-gradient(${dir}, var(--color-background), transparent)`,
          maskImage: `linear-gradient(${dir}, black 30%, transparent)`,
        }}
      />
    ))}
  </>
);

export default ScrollFade;
