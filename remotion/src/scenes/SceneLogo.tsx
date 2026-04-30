import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, FONT, GRADIENT_PRIMARY, SPRING } from "../theme";

export const SceneLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: SPRING.bouncy });
  const scale = interpolate(s, [0, 1], [0.85, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  const sub = spring({ frame: frame - 12, fps, config: SPRING.smooth });
  const subOpacity = interpolate(sub, [0, 1], [0, 1]);
  const subY = interpolate(sub, [0, 1], [10, 0]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", fontFamily: FONT.display }}>
        <div
          style={{
            opacity,
            transform: `scale(${scale})`,
            display: "inline-flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* Logo mark — gradient rounded square with sparkle */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: GRADIENT_PRIMARY,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 50px -15px rgba(33, 102, 244, 0.55)",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z"
                fill="white"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 110,
              fontWeight: 800,
              letterSpacing: -3,
              color: COLORS.foreground,
              lineHeight: 1,
            }}
          >
            PhotoBrief
          </div>
        </div>
        <div
          style={{
            marginTop: 32,
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
