import { Beer, Martini, Mic, Plus, Search, Square, TrendingUp, UserRound, Wine, X } from "lucide-react";
import React from "react";
import { interpolate, interpolateColors } from "remotion";

import { EASE, G, SCREEN_W, fontFamily, lerp, ramp } from "./theme";
import { RISE, SETTLE, T, TRANSCRIPT } from "./timeline";

/* ------------------------------------------------------------------------------------------------
 * The Glass night screen at 375 css px, recreated from Night.tsx + Composer.tsx. Everything is
 * driven by `frame`; nothing animates on its own.
 * ---------------------------------------------------------------------------------------------- */

// Dock geometry (css px), from the real paddings: p-3, gap-2.5, rows min-h-12 / 72 / 14.
const DOCK_PAD = 12;
const FORM_H = 56;
const GAP = 10;
const DOCK_CLOSED = DOCK_PAD + 48 + GAP + 72 + GAP + FORM_H + DOCK_PAD; // 220
const SUGGEST_H = 4 * 48 + 3 * 8; // four chips, one per row at this width
const DOCK_SUGGEST = DOCK_PAD + 48 + GAP + SUGGEST_H + GAP + FORM_H + DOCK_PAD; // 364
const CARD_H = 12 + 28 + 12 + 48 + 12 + 64 + 12; // 188
// +6: on a 667-tall screen the exact 336 leaves a 2px sliver of "Likely" peeking over the dock edge.
const DOCK_CARD = DOCK_PAD + 48 + GAP + CARD_H + GAP + FORM_H + DOCK_PAD + 6; // 342
const DOCK_INSET = 8;

/** The liquid-glass recipe (.g-glass + ::before rim) as inline styles. */
const glass = (strong = false): React.CSSProperties => ({
  background: strong ? G.glassStrong : G.glass,
  backdropFilter: "blur(22px) saturate(180%)",
  WebkitBackdropFilter: "blur(22px) saturate(180%)",
  boxShadow: `inset 0 1px 0 ${G.sheen}, inset 0 0 0 1px rgb(255 255 255 / 0.07), 0 10px 40px -10px rgb(0 0 0 / 0.7)`,
});

const Rim: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      padding: 1,
      background:
        "linear-gradient(160deg, rgb(255 255 255 / 0.32), rgb(255 255 255 / 0.04) 40%, rgb(255 255 255 / 0.02) 70%, rgb(255 255 255 / 0.12))",
      WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
      WebkitMaskComposite: "xor",
      maskComposite: "exclude",
      pointerEvents: "none",
    }}
  />
);

const WarningMark: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 3 2 21h20L12 3Z" />
    <path d="M12 10v5M12 18v.01" strokeLinecap="round" />
  </svg>
);

const row: React.CSSProperties = { display: "flex", alignItems: "center" };

/** Soft translucent circle standing in for a fingertip. */
const Finger: React.FC<{ frame: number; fps: number; x: number; y: number; inAt: number; pressAt: number }> = ({ frame, fps, x, y, inAt, pressAt }) => {
  const s = (sec: number) => sec * fps;
  const arrive = ramp(frame, s(inAt), s(pressAt - inAt));
  const leave = ramp(frame, s(pressAt + 0.22), s(0.35));
  const press = interpolate(frame, [s(pressAt) - 2, s(pressAt) + 2, s(pressAt) + 8], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const opacity = arrive * (1 - leave);
  if (opacity <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 32,
        top: y - 32,
        width: 64,
        height: 64,
        borderRadius: "50%",
        opacity,
        translate: `${lerp(22, 0, arrive)}px ${lerp(34, 0, arrive)}px`,
        scale: String(1 - 0.16 * press),
        background: `radial-gradient(circle at 50% 45%, rgb(255 255 255 / ${0.3 + 0.2 * press}), rgb(255 255 255 / ${0.12 + 0.12 * press}) 70%)`,
        boxShadow: "inset 0 0 0 1.5px rgb(255 255 255 / 0.55), 0 8px 24px rgb(0 0 0 / 0.45)",
        zIndex: 50,
      }}
    />
  );
};

export const Screen: React.FC<{ frame: number; fps: number; height: number }> = ({ frame: f, fps, height }) => {
  const s = (sec: number) => sec * fps;

  // Phases
  const pOpen = ramp(f, s(T.open), s(RISE));
  const pCard = ramp(f, s(T.listenEnd), s(RISE));
  const pClose = ramp(f, s(T.close), s(RISE));
  const added = f >= s(T.num);
  const listen = ramp(f, s(T.open), s(0.15)) * (1 - ramp(f, s(T.listenEnd), s(0.15)));
  const listeningNow = f >= s(T.open) && f < s(T.listenEnd);

  // Estimate
  const pNum = ramp(f, s(T.num), s(SETTLE));
  const pBand = pNum;
  const point = added ? "0.12" : "0.10";
  const [lo, hi] = added ? ["0.09", "0.17"] : ["0.07", "0.14"];
  // Strip scale is max(0.2, bac·1.4·1.12) = 0.2 for both; band = bac·0.75 … bac·1.4, tick at bac.
  const bandL = lerp(37.5, 45, pBand);
  const bandR = lerp(70, 84, pBand);
  const tick = lerp(50, 60, pBand);

  // Dock
  const dockH = DOCK_CLOSED + (DOCK_SUGGEST - DOCK_CLOSED) * pOpen + (DOCK_CARD - DOCK_SUGGEST) * pCard + (DOCK_CLOSED - DOCK_CARD) * pClose;
  const openAlpha = f < s(T.open) ? 0 : pOpen * (1 - ramp(f, s(T.close), s(0.12)));
  const closedAlpha = f < s(T.close) ? 1 - ramp(f, s(T.open), s(0.12)) : ramp(f, s(T.close + 0.06), s(RISE));
  const closedRise = f < s(T.close) ? 0 : 10 * (1 - ramp(f, s(T.close + 0.06), s(RISE)));
  const snack = ramp(f, s(T.status), s(0.26));
  const squeeze = interpolate(f, [s(T.addPress), s(T.addPress + 0.12), s(T.addPress + 0.28)], [1, 0.975, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const words = T.words.filter((w) => f >= s(w)).length;
  const lastWordIn = words > 0 ? ramp(f, s(T.words[words - 1]!), 4) : 1;

  // Mic ring: breathes only while listening (1.4 s, scale 0.9 → 1.35, fading out).
  const ringPeriod = s(1.4);
  const ringPhase = listeningNow ? ((f - s(T.open)) % ringPeriod) / ringPeriod : 0;
  const ringP = EASE(ringPhase);

  const dockBottom = DOCK_INSET;
  const formCenterY = height - dockBottom - DOCK_PAD - FORM_H / 2;
  const micCenterX = SCREEN_W - DOCK_INSET - DOCK_PAD - 4 - 24;
  const addCenterY = height - dockBottom - DOCK_PAD - FORM_H - GAP - 12 - 32;

  return (
    <div
      style={{
        position: "relative",
        width: SCREEN_W,
        height,
        overflow: "hidden",
        background: G.bg,
        color: G.ink,
        fontFamily,
        fontVariantNumeric: "tabular-nums lining-nums",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* The still field of light behind the estimate. */}
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 560,
          background:
            "radial-gradient(60% 55% at 50% 18%, rgb(70 120 255 / 0.22), transparent 70%), radial-gradient(40% 40% at 80% 0%, rgb(124 180 255 / 0.12), transparent 70%)",
        }}
      />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16, padding: "12px 16px 0" }}>
        {/* Top bar */}
        <header style={{ ...glass(), ...row, position: "relative", gap: 8, borderRadius: 16, padding: "8px 8px 8px 16px" }}>
          <Rim />
          <p style={{ flex: 1, margin: 0, fontSize: 18, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.02em" }}>BACulator</p>
          <span style={{ ...row, minHeight: 48, padding: "0 16px", fontSize: 18, fontWeight: 500 }}>Get home</span>
          <span style={{ ...row, minHeight: 48, gap: 8, padding: "0 12px", fontSize: 18, fontWeight: 500 }}>
            <UserRound size={20} strokeWidth={2} />
            You
          </span>
        </header>

        {/* Not safe to drive */}
        <p style={{ ...glass(true), ...row, position: "relative", margin: 0, minHeight: 48, gap: 12, borderRadius: 9999, padding: "0 16px", fontSize: 18, fontWeight: 500 }}>
          <Rim />
          <WarningMark size={20} color={G.alert} />
          <span style={{ flex: 1 }}>Not safe to drive</span>
          <span style={{ color: G.ink2 }}>about {point}</span>
        </p>

        {/* Estimate */}
        <section style={{ padding: "24px 4px 8px" }}>
          <h2 style={{ margin: 0, fontSize: 18, lineHeight: "28px", fontWeight: 500, color: G.ink2 }}>Estimated blood alcohol</h2>
          <p style={{ margin: "8px 0 0", display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 24, lineHeight: "32px", fontWeight: 500 }}>about</span>
            <span
              style={{
                display: "inline-block",
                fontSize: 101.25, // clamp(88px, 27vw, 116px) at 375
                lineHeight: 0.88,
                fontWeight: 500,
                letterSpacing: "-0.055em",
                ...(added
                  ? {
                      filter: `blur(${10 * (1 - pNum)}px)`,
                      opacity: lerp(0.2, 1, pNum),
                      translate: `0px ${10 * (1 - pNum)}px`,
                    }
                  : {}),
              }}
            >
              {point}
            </span>
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 20, lineHeight: "28px", fontWeight: 500 }}>
            Likely {lo} to {hi}
          </p>
          <div style={{ position: "relative", marginTop: 20, height: 4, borderRadius: 9999, background: "rgb(255 255 255 / 0.1)" }}>
            <span
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${bandL}%`,
                width: `${bandR - bandL}%`,
                borderRadius: 9999,
                background: G.signal,
                boxShadow: "0 0 16px 2px rgb(124 180 255 / 0.55)",
              }}
            />
            <span style={{ position: "absolute", top: -8, bottom: -8, width: 2, left: `${tick}%`, translate: "-50% 0", borderRadius: 9999, background: G.ink }} />
          </div>
          <p style={{ ...row, margin: "20px 0 0", gap: 8, fontSize: 18, lineHeight: "28px", fontWeight: 500 }}>
            <TrendingUp size={20} strokeWidth={2} />
            Still rising: about {added ? "0.14 by 5:58 pm" : "0.11 by 5:36 pm"}
          </p>
        </section>

        {/* Tonight (sits behind the dock; the glass blurs it) */}
        <section style={{ background: G.card, border: `1px solid ${G.edge}`, borderRadius: 14, padding: 20 }}>
          <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Tonight</h2>
            <p style={{ margin: 0, fontSize: 18 }}>
              <span style={{ color: G.ink2 }}>Now · </span>
              <span style={{ fontWeight: 500 }}>about {point}</span>
            </p>
          </header>
          <svg viewBox="0 0 400 170" width="100%" height={170} preserveAspectRatio="none" style={{ marginTop: 16, overflow: "visible" }}>
            <defs>
              <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={G.signal} stopOpacity="0.35" />
                <stop offset="1" stopColor={G.signal} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 166 C40 150 70 120 100 92 L100 166 Z" fill="url(#fill)" />
            <path d="M0 166 C40 150 70 120 100 92" fill="none" stroke="#a9ceff" strokeWidth={2.5} />
            <path d="M100 92 C130 64 170 52 210 60 S330 120 400 150" fill="none" stroke={G.signal} strokeWidth={2.5} strokeDasharray="4 6" strokeLinecap="round" opacity={0.85} />
            <line x1={100} x2={100} y1={0} y2={166} stroke="rgb(250 250 250 / 0.5)" strokeWidth={1.5} />
          </svg>
        </section>
      </div>

      {/* The dock */}
      <footer
        style={{
          ...glass(true),
          position: "absolute",
          left: DOCK_INSET,
          right: DOCK_INSET,
          bottom: dockBottom,
          height: dockH,
          borderRadius: 28,
          overflow: "hidden",
          zIndex: 30,
        }}
      >
        <Rim />

        {/* Closed: status line + white pill */}
        <div style={{ position: "absolute", left: DOCK_PAD, right: DOCK_PAD, bottom: DOCK_PAD + FORM_H + GAP, display: "flex", flexDirection: "column", gap: GAP, opacity: closedAlpha, translate: `0px ${closedRise}px` }}>
          <div style={{ ...row, minHeight: 48, gap: 12, padding: "0 8px" }}>
            {f < s(T.close) ? (
              <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 18, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ color: G.ink2 }}>Last: </span>
                <span style={{ fontWeight: 500 }}>Vodka soda</span>
                <span style={{ color: G.ink2 }}> · 6 min ago</span>
              </p>
            ) : (
              <>
                <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 18, whiteSpace: "nowrap", opacity: lerp(0.4, 1, snack), translate: `0px ${10 * (1 - snack)}px` }}>
                  <span style={{ color: G.ink2 }}>Added: </span>
                  <span style={{ fontWeight: 500 }}>Vodka</span>
                </p>
                <span style={{ ...row, minHeight: 48, padding: "0 16px", borderRadius: 9999, background: "rgb(255 255 255 / 0.1)", fontSize: 18, fontWeight: 500, opacity: lerp(0.4, 1, snack), translate: `0px ${10 * (1 - snack)}px` }}>
                  Undo
                </span>
              </>
            )}
          </div>
          <div
            style={{
              ...row,
              justifyContent: "center",
              minHeight: 72,
              gap: 10,
              padding: "0 24px",
              borderRadius: 9999,
              background: G.ink,
              color: G.bg,
              fontSize: 20,
              fontWeight: 500,
              boxShadow: "0 8px 30px -8px rgb(124 180 255 / 0.6)",
            }}
          >
            <Plus size={24} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <span>Add another {f < s(T.close) ? "vodka soda" : "vodka"}</span>
          </div>
        </div>

        {/* Open: header + suggestions, then the parsed card */}
        {openAlpha > 0 && (
          <div style={{ position: "absolute", left: DOCK_PAD, right: DOCK_PAD, bottom: DOCK_PAD + FORM_H + GAP, display: "flex", flexDirection: "column", gap: GAP, opacity: openAlpha, translate: `0px ${10 * (1 - pOpen)}px` }}>
            <div style={{ ...row, justifyContent: "space-between", padding: "0 8px" }}>
              <p style={{ margin: 0, fontSize: 18, color: G.ink2 }}>{f < s(T.listenEnd) ? "Listening…" : "Check it, then add"}</p>
              <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 9999, background: "rgb(255 255 255 / 0.1)" }}>
                <X size={20} strokeWidth={2.25} />
              </span>
            </div>

            {f < s(T.listenEnd) + s(0.12) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, opacity: 1 - ramp(f, s(T.listenEnd), s(0.12)) }}>
                {(
                  [
                    [Martini, "Vodka soda", "1.0"],
                    [Wine, "Glass of red", "1.6"],
                    [Beer, "Schooner of lager", "1.6"],
                    [Beer, "Pint of cider", "2.2"],
                  ] as const
                ).map(([Icon, name, std]) => (
                  <span key={name} style={{ ...row, minHeight: 48, gap: 8, padding: "0 16px", borderRadius: 9999, background: "rgb(255 255 255 / 0.06)", boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.1)", fontSize: 18 }}>
                    <Icon size={20} strokeWidth={2.25} color={G.ink2} />
                    {name}
                    <span style={{ color: G.ink2 }}>{std}</span>
                  </span>
                ))}
              </div>
            )}

            {f >= s(T.listenEnd) && (
              <div
                style={{
                  borderRadius: 22,
                  padding: 12,
                  background: "rgb(255 255 255 / 0.06)",
                  boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.1)",
                  opacity: pCard,
                  translate: `0px ${10 * (1 - pCard)}px`,
                }}
              >
                <div style={{ ...row, gap: 12, padding: "0 4px", fontSize: 18, lineHeight: "28px" }}>
                  <Martini size={20} strokeWidth={2.25} color={G.ink2} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 500 }}>Vodka</span>
                    <span style={{ color: G.ink2 }}> · 60 ml · 40%</span>
                  </span>
                  <span style={{ fontWeight: 500 }}>1.9 std</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, overflow: "hidden" }}>
                  {["Now", "15 min ago", "30 min ago", "1 hour ago"].map((w, k) => (
                    <span
                      key={w}
                      style={{
                        ...row,
                        flexShrink: 0,
                        minHeight: 48,
                        padding: "0 16px",
                        borderRadius: 9999,
                        fontSize: 18,
                        background: k === 0 ? "rgb(255 255 255 / 0.2)" : "rgb(255 255 255 / 0.05)",
                        color: k === 0 ? G.ink : G.ink2,
                        fontWeight: k === 0 ? 500 : 400,
                      }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    ...row,
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 12,
                    minHeight: 64,
                    borderRadius: 9999,
                    background: G.ink,
                    color: G.bg,
                    fontSize: 20,
                    fontWeight: 500,
                    scale: String(squeeze),
                  }}
                >
                  <Plus size={24} strokeWidth={2.5} />
                  Add · 1.9 std
                </div>
              </div>
            )}
          </div>
        )}

        {/* Composer: "Type or say a drink" + mic */}
        <div
          style={{
            ...row,
            position: "absolute",
            left: DOCK_PAD,
            right: DOCK_PAD,
            bottom: DOCK_PAD,
            height: FORM_H,
            gap: 8,
            padding: "4px 4px 4px 16px",
            borderRadius: 9999,
            background: "rgb(255 255 255 / 0.06)",
            boxShadow:
              listen > 0.001
                ? `inset 0 0 0 ${lerp(1, 1.5, listen)}px ${interpolateColors(listen, [0, 1], [G.edge2, G.signal])}, 0 0 24px -6px rgb(124 180 255 / ${0.6 * listen})`
                : `inset 0 0 0 1px ${G.edge2}`,
          }}
        >
          <Search size={20} strokeWidth={2} color={G.ink2} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 18, whiteSpace: "nowrap", overflow: "hidden" }}>
            {words === 0 || f >= s(T.close) ? (
              <span style={{ color: G.ink2 }}>{listeningNow ? "Say it like you’d order it" : "Type or say a drink"}</span>
            ) : (
              TRANSCRIPT.slice(0, words).map((w, k) => (
                <span key={w} style={{ opacity: k === words - 1 ? lastWordIn : 1 }}>
                  {k > 0 ? " " : ""}
                  {w}
                </span>
              ))
            )}
          </span>
          <span
            style={{
              position: "relative",
              display: "grid",
              placeItems: "center",
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: 9999,
              background: interpolateColors(listen, [0, 1], ["rgba(255,255,255,0.1)", G.ink]),
            }}
          >
            {listeningNow && (
              <span
                style={{
                  position: "absolute",
                  inset: -6,
                  borderRadius: "50%",
                  boxShadow: "0 0 0 2px rgb(124 180 255 / 0.7)",
                  scale: String(lerp(0.9, 1.35, ringP)),
                  opacity: (1 - ringP) * listen,
                }}
              />
            )}
            <Mic size={20} strokeWidth={2.25} style={{ position: "absolute", opacity: 1 - listen }} />
            <Square size={16} fill={G.bg} color={G.bg} style={{ position: "absolute", opacity: listen }} />
          </span>
        </div>
      </footer>

      <Finger frame={f} fps={fps} x={micCenterX - 4} y={formCenterY + 6} inAt={T.fingerMic} pressAt={T.micPress} />
      <Finger frame={f} fps={fps} x={SCREEN_W / 2 + 104} y={addCenterY + 10} inAt={T.fingerAdd} pressAt={T.addPress} />
    </div>
  );
};
