// Shared bits for the pixel-art hover interactions in the intro.

// Snaps motion to a few frames so it moves like a sprite, not a tween.
export const steps = (n: number) => (t: number) => Math.floor(t * n) / n;

// Draws a sprite from rows of palette keys; "." is transparent.
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
