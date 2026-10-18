import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Screen } from "./Screen";
import { EASE, G, SCREEN_W } from "./theme";
import { T } from "./timeline";

/** Portrait: the 375 px screen fills a 1080-wide frame (2.88×), so the screen is 375 × 667. */
export const AddFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const zoom = width / SCREEN_W;
  return (
    <AbsoluteFill style={{ background: G.bg }}>
      <div style={{ zoom, width: SCREEN_W, height: height / zoom }}>
        <Screen frame={frame} fps={fps} height={height / zoom} />
      </div>
    </AbsoluteFill>
  );
};

/** Landscape hero: the same screen as a phone on the still blue light field. Loops via a dissolve. */
export const AddFlowLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const screenH = 667;
  const zoom = (height * 0.86) / screenH;
  const back = interpolate(frame, [T.loopFade * fps, T.loopEnd * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(42% 60% at 50% 38%, rgb(70 120 255 / 0.26), transparent 72%), radial-gradient(30% 40% at 72% 6%, rgb(124 180 255 / 0.12), transparent 70%), ${G.bg}`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          zoom,
          position: "relative",
          width: SCREEN_W,
          height: screenH,
          borderRadius: 40,
          overflow: "hidden",
          boxShadow:
            "0 0 0 1px rgb(255 255 255 / 0.09), 0 40px 90px -30px rgb(0 0 0 / 0.9), 0 30px 120px -40px rgb(70 120 255 / 0.45)",
        }}
      >
        <Screen frame={frame} fps={fps} height={screenH} />
        {back > 0 && (
          <div style={{ position: "absolute", inset: 0, opacity: back }}>
            <Screen frame={0} fps={fps} height={screenH} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
