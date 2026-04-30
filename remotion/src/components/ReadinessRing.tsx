import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, SPRING, FONT } from "../theme";

interface Props {
  /** target percentage 0-100 */
  target: number;
  delay?: number;
  size?: number;
}

export const ReadinessRing: React.FC<Props> = ({ target, delay = 0, size = 180 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 80, mass: 1 } });
  const value = interpolate(s, [0, 1], [0, target]);

  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} />
            <stop offset="100%" stopColor={COLORS.primaryGlow} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.ringTrack} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.display,
          color: COLORS.foreground,
        }}
      >
        <div style={{ fontSize: size * 0.32, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
          {Math.round(value)}
        </div>
        <div style={{ fontSize: size * 0.09, fontWeight: 600, color: COLORS.muted, marginTop: 4 }}>
          READY
        </div>
      </div>
    </div>
  );
};
