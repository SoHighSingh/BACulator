// Renders BACulator's app icons from the one vector mark in src/lib/brand-mark-svg.ts (the range
// strip on a dark glass tile), in the system Chrome via Playwright so they match the React BrandMark.
//
//   node scripts/make-icons.mjs            (run from the repo root)
//
// Outputs: src/app/icon.png (32px favicon, "small" drawing so it reads at 16px), src/app/apple-icon.png
// (180, full bleed, opaque: iOS rounds it), public/icons/icon-192.png and icon-512.png (rounded tile,
// transparent corners), public/icons/maskable-512.png (full bleed, glyph in the 80% safe zone).
// Also drops judgeable previews into .shots/brand/.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { enlarge, launch, loadBrandMark, svgRasteriser } from "./brand-mark.mjs";

const root = process.cwd();
const { brandMarkSvg, BRAND_TILE } = await loadBrandMark();

const browser = await launch();
const r = await svgRasteriser(browser);

const write = (file, buf) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, buf);
  console.log(file, buf.length, "bytes");
};

const outputs = [
  { file: "src/app/icon.png", size: 32, svg: brandMarkSvg("calm", { small: true }) },
  { file: "src/app/apple-icon.png", size: 180, svg: brandMarkSvg("calm", { bleed: true }), background: BRAND_TILE },
  { file: "public/icons/icon-192.png", size: 192, svg: brandMarkSvg("calm") },
  { file: "public/icons/icon-512.png", size: 512, svg: brandMarkSvg("calm") },
  { file: "public/icons/maskable-512.png", size: 512, svg: brandMarkSvg("calm", { bleed: true }), background: BRAND_TILE },
];
for (const o of outputs) write(path.join(root, o.file), await r.png(o.svg, o.size, { background: o.background }));

// Previews: the favicon at 16 and 32 in both tones, enlarged ×6 with no smoothing.
const shots = path.join(root, ".shots/brand");
for (const tone of ["calm", "alert"]) {
  for (const size of [16, 32]) {
    const png = await r.png(brandMarkSvg(tone, { small: true }), size);
    write(path.join(shots, `favicon-${size}-${tone}.png`), png);
    write(path.join(shots, `favicon-${size}-${tone}-x6.png`), await enlarge(browser, png, 6));
  }
  // What the standard drawing would look like at 16, for comparison with the small one.
  const std = await r.png(brandMarkSvg(tone), 16);
  write(path.join(shots, `favicon-16-${tone}-standard-x6.png`), await enlarge(browser, std, 6));
}
write(path.join(shots, "mark-alert-512.png"), await r.png(brandMarkSvg("alert"), 512));

await r.close();
await browser.close();
