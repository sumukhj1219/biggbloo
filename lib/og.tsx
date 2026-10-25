import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

const CHECKER = ["#86efac", "#f9a8d4", "#fdba74", "#7dd3fc", "#bef264", "#c4b5fd"];

export const renderOg = async ({ title, subtitle }: { title: string; subtitle: string }) => {
  const avatar = await readFile(path.join(process.cwd(), "public/app/pfp.jpg"), "base64");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "white",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/jpeg;base64,${avatar}`} width={64} height={64} style={{ borderRadius: 8 }} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 30, color: "#0a0a0a" }}>{SITE.name}</span>
            <span style={{ fontSize: 22, color: "#a3a3a3" }}>{SITE.x.handle}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 68, lineHeight: 1.1, color: "#0a0a0a", letterSpacing: -1.5 }}>{title}</span>
          <span style={{ fontSize: 30, lineHeight: 1.4, color: "#737373" }}>{subtitle}</span>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: 22,
                background: CHECKER[i % CHECKER.length],
                opacity: i % 2 ? 0.55 : 1,
              }}
            />
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  );
};
