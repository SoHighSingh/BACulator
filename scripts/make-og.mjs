// Renders the link-preview image (1200×630) in the system Chrome via Playwright:
// the Glass world (dark field, blue light), the mark, the wordmark, the descriptor, the landing
// headline, and the range strip with "about 0.04" riding the tick. Never a legal limit, never green.
//
//   node scripts/make-og.mjs            (run from the repo root)
//
// Writes src/app/opengraph-image.png and src/app/twitter-image.png (Next wires both into metadata).
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launch, loadBrandMark } from "./brand-mark.mjs";

const root = process.cwd();
const { brandMarkSvg } = await loadBrandMark();

// Copy. The headline is the landing's line; change it here only.
const HEADLINE = "See where you’re at.";
const DESCRIPTOR = "Blood alcohol estimator";
// The strip: a calm, modest estimate. The track runs 0 to SCALE_MAX, the band is the likely range,
// the tick is the point estimate. Never a legal limit.
const NUMBER = 0.04, RANGE = [0.025, 0.06], SCALE_MAX = 0.12;

// Geist, as the site uses it (next/font self-hosts the same family). Next ships the variable
// latin build for its dev overlay; load it with @font-face so the render needs no network.
const fontFile = path.join(root, "node_modules/next/dist/next-devtools/server/font/geist-latin.woff2");
const font = `data:font/woff2;base64,${readFileSync(fontFile).toString("base64")}`;

const W = 1200, H = 630;
const STRIP_X = 84, STRIP_W = W - 2 * STRIP_X;
const px = (v) => Math.round((v / SCALE_MAX) * STRIP_W); // position on the strip, relative to its left edge
const bandL = px(RANGE[0]), bandW = px(RANGE[1]) - bandL, tickX = px(NUMBER);
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Geist;src:url(${font}) format("woff2");font-weight:100 900;font-display:block}
html,body{margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:#09090b;color:#fafafa;font-family:Geist,system-ui,sans-serif;position:relative}
.field{position:absolute;inset:0;background:
  radial-gradient(640px 420px at 22% 36%, rgb(124 180 255 / 0.34), transparent 70%),
  radial-gradient(900px 520px at 70% 110%, rgb(124 180 255 / 0.14), transparent 70%)}
.row{position:absolute;left:84px;top:84px;display:flex;align-items:center;gap:36px}
.mark{width:168px;height:168px;filter:drop-shadow(0 18px 48px rgb(124 180 255 / 0.28))}
.word{font-size:132px;font-weight:600;letter-spacing:-0.055em;line-height:1;margin-top:-6px}
.desc{position:absolute;left:84px;top:296px;font-size:36px;font-weight:500;color:#a1a1aa;letter-spacing:-0.01em}
.head{position:absolute;left:84px;top:366px;font-size:54px;font-weight:600;letter-spacing:-0.045em;line-height:1.05}
.strip{position:absolute;left:${STRIP_X}px;width:${STRIP_W}px;top:548px;height:8px;border-radius:4px;background:rgb(255 255 255 / 0.14)}
.band{position:absolute;left:${bandL}px;width:${bandW}px;top:-2px;height:12px;border-radius:6px;background:#7cb4ff;box-shadow:0 0 28px 6px rgb(124 180 255 / 0.55)}
.tick{position:absolute;left:${tickX - 5}px;top:-22px;width:10px;height:52px;border-radius:5px;background:#fafafa;box-shadow:0 0 18px rgb(255 255 255 / 0.35)}
.about{position:absolute;left:${tickX}px;transform:translateX(-50%);top:-78px;font-size:34px;font-weight:500;letter-spacing:-0.02em;white-space:nowrap}
.about b{font-weight:600}
</style>
<div class="field"></div>
<div class="row">${brandMarkSvg("calm").replace("<svg ", '<svg class="mark" ')}<div class="word">BACulator</div></div>
<div class="desc">${DESCRIPTOR}</div>
<div class="head">${HEADLINE}</div>
<div class="strip"><div class="band"></div><div class="tick"></div><div class="about">about <b>${NUMBER.toFixed(2)}</b></div></div>`;

const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const loaded = await page.evaluate(() => document.fonts.check("600 100px Geist"));
if (!loaded) throw new Error("Geist did not load for the OG render");
const png = await page.screenshot({ type: "png" });
await browser.close();

const og = path.join(root, "src/app/opengraph-image.png");
writeFileSync(og, png);
copyFileSync(og, path.join(root, "src/app/twitter-image.png"));
console.log(og, png.length, "bytes (+ twitter-image.png)");
