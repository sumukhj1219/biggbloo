#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const ATTR_MAP = {
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  "clip-path": "clipPath",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  "flood-opacity": "floodOpacity",
  "flood-color": "floodColor",
  "color-interpolation-filters": "colorInterpolationFilters",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "stroke-miterlimit": "strokeMiterlimit",
  "stroke-opacity": "strokeOpacity",
  "fill-opacity": "fillOpacity",
  "font-family": "fontFamily",
  "font-size": "fontSize",
  "font-weight": "fontWeight",
  "text-anchor": "textAnchor",
  "text-decoration": "textDecoration",
  "letter-spacing": "letterSpacing",
  "dominant-baseline": "dominantBaseline",
  "vector-effect": "vectorEffect",
  "shape-rendering": "shapeRendering",
  "image-rendering": "imageRendering",
  "pointer-events": "pointerEvents",
  "paint-order": "paintOrder",
  "xlink:href": "xlinkHref",
};

const cssPropToCamel = (prop) =>
  prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const fixStyleStrings = (source) =>
  source.replace(/style="([^"]*)"/g, (_, css) => {
    const entries = css
      .split(";")
      .map((rule) => rule.trim())
      .filter(Boolean)
      .map((rule) => {
        const [prop, ...rest] = rule.split(":");
        const value = rest.join(":").trim();
        return `${cssPropToCamel(prop.trim())}: ${JSON.stringify(value)}`;
      });
    return `style={{ ${entries.join(", ")} }}`;
  });

const fixAttrs = (source) => {
  let result = source;
  for (const [kebab, camel] of Object.entries(ATTR_MAP)) {
    result = result.replaceAll(`${kebab}=`, `${camel}=`);
  }
  return result;
};

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/fix-svg-jsx.mjs <file.tsx> [more files...]");
  process.exit(1);
}

for (const file of files) {
  const original = readFileSync(file, "utf8");
  const fixed = fixAttrs(fixStyleStrings(original));
  if (fixed !== original) {
    writeFileSync(file, fixed);
    console.log(`fixed: ${file}`);
  } else {
    console.log(`no changes needed: ${file}`);
  }
}
