// Renders BACulator's app icons from one vector mark: dark glass, light liquid with a wave crest
// (the old BACULATROR.png, redrawn so it's sharp at any size and has no baked-in corners).
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";

// Run from the repo root: node scripts/make-icons.mjs
const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const sharp = require("sharp");

const BG = "#121110", INK = "#EDEAE4", LINE = "#6E6A64";

// The liquid in a 512 box: surface dips left, crests right of centre.
const body = "M-8 236 C 40 258 82 266 130 262 C 214 256 282 212 384 210 C 440 209 482 220 520 234 L520 520 L-8 520 Z";
const wave = `<path d="${body}" fill="${LINE}" transform="translate(-14 -8)"/><path d="${body}" fill="${INK}"/>`;

// Full-bleed square (iOS rounds it itself).
const square = `<rect width="512" height="512" fill="${BG}"/>${wave}`;

// Rounded glass with a light rim, for places that show the icon as-is.
const R = 104, RIM = 14;
const rounded = (x, y, s) => {
  const k = s / 512;
  return `<g transform="translate(${x} ${y}) scale(${k})">
    <clipPath id="c"><rect width="512" height="512" rx="${R}"/></clipPath>
    <g clip-path="url(#c)">${square}</g>
    <rect x="${RIM / 2}" y="${RIM / 2}" width="${512 - RIM}" height="${512 - RIM}" rx="${R - RIM / 2}" fill="none" stroke="${INK}" stroke-width="${RIM}"/>
  </g>`;
};

const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${inner}</svg>`;
const any = svg(rounded(0, 0, 512));
const apple = svg(square);
// Maskable: about 20% padding on the background, so any launcher mask keeps the whole glass.
const pad = 512 * 0.2;
const maskable = svg(`<rect width="512" height="512" fill="${BG}"/>${rounded(pad, pad, 512 - 2 * pad)}`);

const out = async (s, size, file, opaque) => {
  mkdirSync(path.dirname(file), { recursive: true });
  let img = sharp(Buffer.from(s), { density: 72 * (size / 512) * 4 }).resize(size, size);
  if (opaque) img = img.flatten({ background: BG });
  await img.png({ compressionLevel: 9 }).toFile(file);
  console.log(file, size);
};

await out(any, 512, path.join(root, "src/app/icon.png"), false);
await out(apple, 180, path.join(root, "src/app/apple-icon.png"), true);
await out(any, 192, path.join(root, "public/icons/icon-192.png"), false);
await out(any, 512, path.join(root, "public/icons/icon-512.png"), false);
await out(maskable, 512, path.join(root, "public/icons/maskable-512.png"), true);
