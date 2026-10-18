import { describe, expect, it } from "vitest";
import { brandMarkDataUrl, brandMarkSvg, BRAND_TONES } from "./brand-mark-svg";

describe("brandMarkSvg", () => {
  it("is a standalone SVG with the tile, band and white tick", () => {
    const svg = brandMarkSvg("calm");
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"')).toBe(true);
    expect(svg).toContain('fill="#111114"');
    expect(svg).toContain(`fill="${BRAND_TONES.calm.band}"`);
    expect(svg).toContain('fill="#fafafa"');
  });

  it("turns the band red in the alert tone and keeps the tick white", () => {
    const svg = brandMarkSvg("alert");
    expect(svg).toContain('fill="#ffa494"');
    expect(svg).toContain('fill="#ff6a55"'); // the glow under the band
    expect(svg).not.toContain("#7cb4ff");
    expect(svg).toContain('fill="#fafafa"');
  });

  it("drops the blur filter for the small (favicon) drawing", () => {
    const svg = brandMarkSvg("calm", { small: true });
    expect(svg).not.toContain("<filter");
    expect(svg).not.toContain("filter=");
  });

  it("draws a range strip, not a cross: band wider than the tick is tall, tick at 40% of the band", () => {
    for (const small of [false, true]) {
      const svg = brandMarkSvg("calm", { small });
      const band = /<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="([\d.]+)" rx="[\d.]+" fill="#7cb4ff"\/>/.exec(svg);
      const tick = /<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="([\d.]+)" rx="[\d.]+" fill="#fafafa"\/>/.exec(svg);
      if (!band || !tick) throw new Error("band or tick missing");
      const [bx, bw] = [+band[1]!, +band[2]!];
      const [tx, tw, th] = [+tick[1]!, +tick[2]!, +tick[3]!];
      expect(bw).toBeGreaterThan(th * 1.3);
      expect(bw).toBeGreaterThan(tw * 6);
      const at = (tx + tw / 2 - bx) / bw;
      expect(at).toBeGreaterThan(0.33);
      expect(at).toBeLessThan(0.45);
    }
  });

  it("moves the tick right in the alert tone, still inside the band (the needle moved up)", () => {
    const tickRe = /<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="[\d.]+" rx="[\d.]+" fill="#fafafa"\/>/;
    for (const small of [false, true]) {
      const calm = tickRe.exec(brandMarkSvg("calm", { small }));
      const alert = tickRe.exec(brandMarkSvg("alert", { small }));
      const bandRe = (c: string) => new RegExp(`<rect x="([\\d.]+)" y="[\\d.]+" width="([\\d.]+)" height="[\\d.]+" rx="[\\d.]+" fill="${c}"\\/>`);
      const band = bandRe("#ffa494").exec(brandMarkSvg("alert", { small }));
      const calmBand = bandRe("#7cb4ff").exec(brandMarkSvg("calm", { small }));
      if (!calm || !alert || !band || !calmBand) throw new Error("tick or band missing");
      const [cx, ax, tw] = [+calm[1]!, +alert[1]!, +alert[2]!];
      const [bx, bw] = [+band[1]!, +band[2]!];
      // Standard: +6 (BrandMark.tsx's .bm-tick.is-alert); small: +8, pixel-snapped on its 4-unit grid.
      expect(ax - cx).toBe(small ? 8 : 6);
      const at = (ax + tw / 2 - bx) / bw;
      expect(at).toBeGreaterThan(0.5);
      expect(at).toBeLessThan(0.7);
      // Only the tick moves: the band is drawn in the same place in both tones.
      expect([band[1], band[2]]).toEqual([calmBand[1], calmBand[2]]);
    }
  });

  it("bleeds to the square edge and scales the glyph into the 80% safe zone", () => {
    const svg = brandMarkSvg("calm", { bleed: true });
    expect(svg).toContain('<rect width="64" height="64" fill="#111114"/>');
    expect(svg).toContain('transform="translate(6.4 6.4) scale(0.8)"');
    expect(svg).not.toContain("rx=\"16\"");
  });

  it("gives each copy its own gradient ids so two marks on one page never clash", () => {
    const a = /id="(bm\d+)-rim"/.exec(brandMarkSvg("calm"))?.[1];
    const b = /id="(bm\d+)-rim"/.exec(brandMarkSvg("alert"))?.[1];
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it("sets explicit dimensions only when asked", () => {
    expect(brandMarkSvg("calm")).not.toContain("width=\"64\" height=\"64\" role");
    expect(brandMarkSvg("calm", { size: 32 })).toContain('width="32" height="32"');
  });

  it("makes a data: URL fit for <link rel=icon>", () => {
    const url = brandMarkDataUrl("alert", { small: true });
    expect(url.startsWith("data:image/svg+xml,%3Csvg")).toBe(true);
    expect(decodeURIComponent(url.slice("data:image/svg+xml,".length))).toContain("#ffa494");
  });
});
