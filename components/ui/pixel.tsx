export const steps = (n: number) => (t: number) => Math.floor(t * n) / n;

export const PixelSprite = ({
  rows,
  colors,
  className,
  children,
}: {
  rows: string[];
  colors: Record<string, string>;
  className?: string;
  children?: React.ReactNode;
}) => (
  <svg
    viewBox={`0 0 ${rows[0].length} ${rows.length}`}
    shapeRendering="crispEdges"
    className={className}
  >
    {rows.flatMap((row, y) =>
      [...row].map((c, x) =>
        c === "." ? null : (
          <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={colors[c]} />
        ),
      ),
    )}
    {children}
  </svg>
);
