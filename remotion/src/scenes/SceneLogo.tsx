import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, FONT, SPRING } from "../theme";

export const SceneLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: SPRING.bouncy });
  const scale = interpolate(s, [0, 1], [0.88, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  const sub = spring({ frame: frame - 12, fps, config: SPRING.smooth });
  const subOpacity = interpolate(sub, [0, 1], [0, 1]);
  const subY = interpolate(sub, [0, 1], [10, 0]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", fontFamily: FONT.display }}>
        <Img
          src={staticFile("brand/photobrief-horizontal.png")}
          style={{
            height: 180,
            width: "auto",
            opacity,
            transform: `scale(${scale})`,
            filter: "drop-shadow(0 24px 60px rgba(33, 102, 244, 0.35))",
          }}
        />
        <div
          style={{
            marginTop: 36,
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontSize: 28,
            fontWeight: 500,
            color: COLORS.muted,
            letterSpacing: 0.5,
          }}
        >
          AI-guided visual intake
        </div>
      </div>
    </AbsoluteFill>
  );
};
