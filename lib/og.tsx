import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

const { width: W, height: H } = OG_SIZE;
const LOGO = 140;
const GAP = 36;
const NAME_SIZE = 96;
const LINE = "#e5e5e5";
const GUIDE = "#d4d4d4";
const LABEL = "#a3a3a3";

const loadFont = async (family: string, weight: number) => {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
};

const Guides = ({ x, y }: { x: number; y: number }) => {
  const cx = x + LOGO / 2;
  const cy = y + LOGO / 2;
  const dim = y - 32;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <line x1={0} y1={y} x2={W} y2={y} stroke={LINE} strokeWidth={1.5} />
      <line x1={0} y1={y + LOGO} x2={W} y2={y + LOGO} stroke={LINE} strokeWidth={1.5} />
      <line x1={0} y1={cy} x2={W} y2={cy} stroke={LINE} strokeWidth={1.5} strokeDasharray="6 8" />
      <line x1={x} y1={0} x2={x} y2={H} stroke={LINE} strokeWidth={1.5} />
      <line x1={x + LOGO} y1={0} x2={x + LOGO} y2={H} stroke={LINE} strokeWidth={1.5} />
      <line x1={x + LOGO + GAP} y1={0} x2={x + LOGO + GAP} y2={H} stroke={LINE} strokeWidth={1.5} strokeDasharray="6 8" />
      <circle cx={cx} cy={cy} r={LOGO / 2} fill="none" stroke={GUIDE} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={LOGO * 0.95} fill="none" stroke={GUIDE} strokeWidth={1.5} strokeDasharray="4 6" />
      <circle cx={cx} cy={cy} r={LOGO * 1.5} fill="none" stroke={LINE} strokeWidth={1.5} />
      <line x1={x} y1={dim} x2={x + LOGO} y2={dim} stroke={LABEL} strokeWidth={1.5} />
      <line x1={x} y1={dim - 7} x2={x} y2={dim + 7} stroke={LABEL} strokeWidth={1.5} />
      <line x1={x + LOGO} y1={dim - 7} x2={x + LOGO} y2={dim + 7} stroke={LABEL} strokeWidth={1.5} />
      <line x1={x + LOGO} y1={y + LOGO + 1} x2={x + LOGO + GAP} y2={y + LOGO + 1} stroke={LABEL} strokeWidth={3} />
      {[
        [40, 40, 1, 1],
        [W - 40, 40, -1, 1],
        [40, H - 40, 1, -1],
        [W - 40, H - 40, -1, -1],
      ].map(([px, py, sx, sy]) => (
        <path
          key={`${px}-${py}`}
          d={`M${px} ${py + sy * 24}V${py}H${px + sx * 24}`}
          fill="none"
          stroke={GUIDE}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
};

export const renderOg = async ({ title }: { title?: string } = {}) => {
  const [avatar, sans, mono] = await Promise.all([
    readFile(path.join(process.cwd(), "public/app/pfp.jpg"), "base64"),
    loadFont("Plus+Jakarta+Sans", 600),
    loadFont("JetBrains+Mono", 400),
  ]);
  const nameWidth = SITE.name.length * NAME_SIZE * 0.58;
  const x = Math.round((W - (LOGO + GAP + nameWidth)) / 2);
  const y = Math.round((title ? 250 : H / 2) - LOGO / 2);
  const label = { position: "absolute", fontFamily: "Mono", fontSize: 16, color: LABEL } as const;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "white", fontFamily: "Sans" }}>
        <Guides x={x} y={y} />
        <span style={{ ...label, left: x, top: y - 62, width: LOGO, justifyContent: "center" }}>{LOGO}</span>
        <span style={{ ...label, left: x + LOGO + 6, top: y + LOGO + 8 }}>{GAP}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/jpeg;base64,${avatar}`}
          width={LOGO}
          height={LOGO}
          style={{ position: "absolute", left: x, top: y, borderRadius: 12 }}
          alt=""
        />
        <span
          style={{
            position: "absolute",
            left: x + LOGO + GAP,
            top: y + (LOGO - NAME_SIZE) / 2,
            fontSize: NAME_SIZE,
            lineHeight: 1,
            letterSpacing: -2,
            color: "#0a0a0a",
          }}
        >
          {SITE.name}
        </span>
        {title && (
          <span style={{ position: "absolute", left: 72, bottom: 64, maxWidth: 720, fontSize: 40, lineHeight: 1.2, letterSpacing: -0.5, color: "#0a0a0a" }}>
            {title}
          </span>
        )}
        <span style={{ position: "absolute", right: 72, bottom: 64, fontSize: 30, color: LABEL }}>
          Creative developer
        </span>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        ...(sans ? [{ name: "Sans", data: sans, weight: 600 as const }] : []),
        ...(mono ? [{ name: "Mono", data: mono, weight: 400 as const }] : []),
      ],
    },
  );
};
