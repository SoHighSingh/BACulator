// Loads src/lib/brand-mark-svg.ts for the asset scripts (Node 20 can't import .ts directly), and
// renders SVG strings to PNG in the system Chrome via Playwright, so the icons match what the
// browser draws for the React mark.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));

/** @returns {Promise<typeof import("../src/lib/brand-mark-svg.ts")>} */
export async function loadBrandMark() {
  const ts = require("typescript");
  const src = readFileSync(path.join(root, "src/lib/brand-mark-svg.ts"), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

export const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

/**
 * Opens one Chrome page that renders a square SVG at an exact pixel size.
 * @param {import("playwright-core").Browser} browser
 */
export async function svgRasteriser(browser) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  return {
    /**
     * @param {string} svg
     * @param {number} size px
     * @param {{ background?: string }} [opts] background: a CSS colour for opaque output; omitted = transparent PNG
     */
    async png(svg, size, opts = {}) {
      const bg = opts.background ?? "transparent";
      await page.setContent(
        `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}#i{width:${size}px;height:${size}px;background:${bg};display:block}#i svg{display:block;width:100%;height:100%}</style><div id="i">${svg}</div>`,
        { waitUntil: "load" },
      );
      return page.locator("#i").screenshot({ omitBackground: true, type: "png" });
    },
    close: () => page.close(),
  };
}

/**
 * Nearest-neighbour enlargement of a PNG (for judging 16/32px renders on a contact sheet).
 * @param {Buffer} png @param {number} factor
 */
export async function enlarge(browser, png, factor) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  const src = `data:image/png;base64,${png.toString("base64")}`;
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}canvas{display:block}</style><canvas id="c"></canvas>`,
  );
  await page.evaluate(
    async ([src, f]) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.getElementById("c");
      c.width = img.width * f;
      c.height = img.height * f;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, c.width, c.height);
    },
    [src, factor],
  );
  const out = await page.locator("#c").screenshot({ omitBackground: true, type: "png" });
  await page.close();
  return out;
}

export const launch = () => chromium.launch({ executablePath: CHROME });
