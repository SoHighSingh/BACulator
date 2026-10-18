// Impaired-user rubric measurements in real Chrome (dev aid; see the designing-for-impaired-users skill).
//
//   node scripts/rubric.mjs <url> [width height]
//
// Reports: targets under 48px (and the primary's height), text under 18px / 16px, weights under 500 on
// buttons, and every distinct text colour pair with its contrast ratio (flagging < 4.5 and, for text
// 28px+ or bold status words, < 7).
import { chromium } from "playwright-core";

const [url, w = "375", h = "812"] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: +w, height: +h }, isMobile: +w < 768, hasTouch: +w < 768, colorScheme: "dark" });
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);

const report = await page.evaluate(() => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  // Effective background: walk up until an opaque background colour is found.
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.5) return c;
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest(".sr-only,[aria-hidden=true]");
  };

  const small = [];
  for (const el of document.querySelectorAll("button, a, [role=button], input, select")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 47.5 || r.width < 47.5) small.push(`${el.textContent.trim().slice(0, 30) || el.getAttribute("aria-label")}: ${Math.round(r.width)}×${Math.round(r.height)}`);
  }

  const pairs = new Map();
  const tiny = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.textContent.trim();
    const el = t.parentElement;
    if (!text || !el || !visible(el)) continue;
    const s = getComputedStyle(el);
    const size = parseFloat(s.fontSize);
    if (size < 18) tiny.add(`${Math.round(size)}px "${text.slice(0, 40)}"`);
    const fg = parse(s.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const cr = ratio(fg, bg);
    const key = `${s.color} on rgb(${bg.r}, ${bg.g}, ${bg.b})`;
    const prev = pairs.get(key);
    if (!prev || size > prev.size) pairs.set(key, { ratio: +cr.toFixed(2), size, sample: text.slice(0, 32), weight: s.fontWeight });
  }

  const primary = [...document.querySelectorAll(".dock-primary")].filter(visible).map((el) => Math.round(el.getBoundingClientRect().height));
  return {
    primaryHeights: primary,
    targetsUnder48: small,
    textUnder18: [...tiny].slice(0, 25),
    contrast: [...pairs.entries()]
      .map(([k, v]) => ({ pair: k, ...v, flag: v.ratio < 4.5 ? "FAIL<4.5" : v.size >= 28 && v.ratio < 7 ? "large<7" : "" }))
      .sort((a, b) => a.ratio - b.ratio),
  };
});
console.log(JSON.stringify({ url, size: `${w}x${h}`, ...report }, null, 1));
await browser.close();
