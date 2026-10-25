import { OG_SIZE, renderOg } from "@/lib/og";
import { SITE } from "@/lib/site";

export const alt = SITE.title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    title: "I build pixel-perfect UIs, games and backends.",
    subtitle: "Creative developer from India. Sweating the small details.",
  });
}
