// Lay screenshots side by side into one PNG, in real Chrome (dev aid for design reviews).
//
//   node scripts/contact-sheet.mjs <out.png> <columnWidthPx> "<Title A>=<a.png>" "<Title B>=<b.png>" ...
//
// Images keep their aspect ratio; each column is labelled with its title.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [out, colW, ...items] = process.argv.slice(2);
const cols = items.map((it) => {
  const i = it.indexOf("=");
  const file = path.resolve(it.slice(i + 1));
  return { title: it.slice(0, i), src: `data:image/png;base64,${fs.readFileSync(file).toString("base64")}` };
});
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#1a1a1a;color:#eee;font:600 22px system-ui,sans-serif;padding:24px;display:flex;gap:24px;align-items:flex-start;width:max-content}
figure{margin:0;width:${colW}px}figcaption{margin:0 0 12px}img{width:100%;display:block;border-radius:6px}
</style>${cols.map((c) => `<figure><figcaption>${c.title}</figcaption><img src="${c.src}"></figure>`).join("")}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
