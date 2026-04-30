import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../theme";

/**
 * Persistent painterly background — soft gradient sky with two slowly drifting
 * color blobs. Uses `filter: blur()` (cheap, GPU-friendly enough for one or two
 * elements) instead of backdropFilter, per sandbox constraints.
 */
export const AmbientBackground: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow drift across the full video
  const x1 = interpolate(frame, [0, 800], [-100, 80]);
  const y1 = interpolate(frame, [0, 800], [-60, 40]);
  const x2 = interpolate(frame, [0, 800], [60, -120]);
  const y2 = interpolate(frame, [0, 800], [40, -40]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bgWarm} 0%, ${COLORS.bg} 60%, ${COLORS.bg} 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -200 + y1,
          left: -200 + x1,
          width: 1100,
          height: 1100,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${COLORS.primary}, transparent 70%)`,
          opacity: 0.18,
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 200 + y2,
          right: -300 + x2,
          width: 1200,
          height: 1200,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${COLORS.primaryGlow}, transparent 70%)`,
          opacity: 0.16,
          filter: "blur(60px)",
        }}
      />
    </AbsoluteFill>
  );
};
