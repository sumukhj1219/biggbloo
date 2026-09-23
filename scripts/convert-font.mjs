// One-time conversion: the actual Figtree font (cached locally by next/font
// during `next dev`) → a Three.js "typeface" JSON, the format FontLoader /
// TextGeometry expect. Schema confirmed against the real FontLoader.js
// source (node_modules/three/examples/jsm/loaders/FontLoader.js), not
// guessed — its outline mini-language and field names are unusual enough
// (e.g. the "q"/"b" commands store the END point before the control
// point(s), the reverse of SVG) that guessing would risk garbled letters.
//
// Run once: node scripts/convert-font.mjs
// Regenerate only if you need more characters than CHARSET covers below.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { decompress } from "wawoff2";
import opentype from "opentype.js";

const WOFF2_PATH =
  ".next/dev/static/media/400bf8aa837fcb7e-s.19g-lkcx7iw64.woff2";
const OUT_PATH = "public/fonts/figtree.typeface.json";

// Printable ASCII (32–126) covers everything Latin text on this site uses.
const CHARSET = Array.from({ length: 127 - 32 }, (_, i) =>
  String.fromCharCode(32 + i),
);

const woff2 = readFileSync(WOFF2_PATH);
const sfnt = await decompress(woff2);
const font = opentype.parse(
  sfnt.buffer.slice(sfnt.byteOffset, sfnt.byteOffset + sfnt.byteLength),
);

const glyphs = {};
for (const char of CHARSET) {
  const glyph = font.charToGlyph(char);
  if (!glyph || !glyph.path || glyph.path.commands.length === 0) {
    if (char !== " ") continue; // space has no path, but still needs an entry for its advance width
  }

  const commands = glyph.path ? glyph.path.commands : [];
  const tokens = [];
  for (const c of commands) {
    switch (c.type) {
      case "M":
        tokens.push("m", c.x, c.y);
        break;
      case "L":
        tokens.push("l", c.x, c.y);
        break;
      case "Q":
        // FontLoader's "q" stores [end, control] — the reverse of SVG's
        // [control, end] — confirmed by reading its parser, not assumed.
        tokens.push("q", c.x, c.y, c.x1, c.y1);
        break;
      case "C":
        // Same reversal for "b" (cubic): [end, control1, control2].
        tokens.push("b", c.x, c.y, c.x1, c.y1, c.x2, c.y2);
        break;
      // "Z" has no case in FontLoader's parser — omitted deliberately,
      // matching what the real facetype.js converter output looks like.
    }
  }

  glyphs[char] = {
    ha: Math.round(glyph.advanceWidth),
    o: tokens.join(" ") + " ",
  };
}

const typeface = {
  glyphs,
  familyName: "Figtree",
  resolution: font.unitsPerEm,
  boundingBox: {
    yMin: font.tables.head.yMin,
    xMin: font.tables.head.xMin,
    yMax: font.tables.head.yMax,
    xMax: font.tables.head.xMax,
  },
  ascender: font.ascender,
  descender: font.descender,
  underlinePosition: font.tables.post?.underlinePosition ?? -100,
  underlineThickness: font.tables.post?.underlineThickness ?? 50,
  cssFontWeight: "normal",
  cssFontStyle: "normal",
};

mkdirSync("public/fonts", { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(typeface));
console.log(
  `Wrote ${OUT_PATH} — ${Object.keys(glyphs).length} glyphs, resolution ${font.unitsPerEm}.`,
);
