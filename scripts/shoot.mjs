// Visual check in real Chrome. The Claude desktop browser pane runs pages hidden, which freezes
// requestAnimationFrame and canvases, so verify UI with this instead.
//
//   npm run shoot -- <outDir> <url> [width height] [--actions=<json>]
//   RM=1 npm run shoot -- ...            (emulate prefers-reduced-motion)
//
// Example:
//   npm run shoot -- .shots/night http://localhost:3000/dev/night 375 812 //     '--actions=[{"click":"+ New drink","exact":true},{"wait":500,"shot":1}]'
//
// Actions run in order: {click: text, exact?}, {scroll: px (scrolls .app-main or the page)},
// {wait: ms}, {shot: 1, full?: true}. Prints overflow, canvas pixel coverage and console errors.
// Uses the system Chrome (set CHROME_PATH to override).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [outDir, url, w = "375", h = "812", ...rest] = process.argv.slice(2);
const actionsArg = rest.find((a) => a.startsWith("--actions="));
const actions = actionsArg ? JSON.parse(actionsArg.slice(10)) : [];
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: 2,
  isMobile: +w < 768,
  hasTouch: +w < 768,
  reducedMotion: process.env.RM ? "reduce" : "no-preference",
  colorScheme: "dark",
});
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 300)));
page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 300)));

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);

const slug = (s) => s.replace(/[^a-z0-9]+/gi, "-").slice(0, 60);
const base = path.join(outDir, `${slug(new URL(url).pathname + new URL(url).search)}-${w}x${h}`);
await page.screenshot({ path: `${base}-0.png` });

let i = 1;
for (const a of actions) {
  if (a.click) await page.getByText(a.click, { exact: a.exact ?? false }).first().click();
  if (a.scroll) await page.evaluate((y) => (document.querySelector(".app-main") ?? document.scrollingElement).scrollBy(0, y), a.scroll);
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.shot) await page.screenshot({ path: `${base}-${i++}.png`, fullPage: !!a.full });
}

// Canvas health: how many non-transparent pixels each canvas has.
const canvases = await page.evaluate(() =>
  [...document.querySelectorAll("canvas")].map((c) => {
    const ctx = c.getContext("2d");
    if (!c.width || !c.height || !ctx) return { w: c.width, h: c.height, painted: 0 };
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let painted = 0;
    for (let k = 3; k < d.length; k += 4) if (d[k] > 0) painted++;
    return { w: c.width, h: c.height, css: [c.clientWidth, c.clientHeight], painted, pct: +((100 * painted) / (c.width * c.height)).toFixed(1) };
  }),
);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log(JSON.stringify({ url, size: `${w}x${h}`, overflow, canvases, errors: [...new Set(errors)].slice(0, 8) }, null, 1));
await browser.close();
