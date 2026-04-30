import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, FONT, GRADIENT_PRIMARY, SPRING } from "../theme";

export const SceneClosing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: SPRING.bouncy });
  const op = interpolate(s, [0, 1], [0, 1]);
  const ty = interpolate(s, [0, 1], [16, 0]);

  const sub = spring({ frame: frame - 18, fps, config: SPRING.smooth });
  const subOp = interpolate(sub, [0, 1], [0, 1]);
  const subY = interpolate(sub, [0, 1], [10, 0]);

  const url = spring({ frame: frame - 32, fps, config: SPRING.smooth });
  const urlOp = interpolate(url, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ textAlign: "center", fontFamily: FONT.display, maxWidth: 1500 }}>
        <div
          style={{
            opacity: op,
            transform: `translateY(${ty}px)`,
            fontSize: 110,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.05,
            color: COLORS.foreground,
          }}
        >
          Send a link.
        </div>
        <div
          style={{
            opacity: subOp,
            transform: `translateY(${subY}px)`,
            fontSize: 110,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.05,
            color: COLORS.foreground,
            marginTop: 4,
          }}
        >
          Get a{" "}
          <span
            style={{
              background: GRADIENT_PRIMARY,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            complete brief
          </span>
          .
        </div>
        <div
          style={{
            opacity: urlOp,
            marginTop: 56,
            fontSize: 32,
            fontWeight: 600,
            color: COLORS.muted,
            letterSpacing: 0.5,
          }}
        >
          photobrief.ai
        </div>
      </div>
    </AbsoluteFill>
  );
};
