import React from "react";
import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, FONT, SPRING } from "../theme";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  delay?: number;
  align?: "left" | "right" | "center";
  style?: React.CSSProperties;
}

export const Caption: React.FC<Props> = ({
  eyebrow,
  title,
  subtitle,
  delay = 0,
  align = "left",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: SPRING.smooth });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const ty = interpolate(s, [0, 1], [18, 0]);

  const sSub = spring({ frame: frame - delay - 8, fps, config: SPRING.smooth });
  const opacitySub = interpolate(sSub, [0, 1], [0, 1]);
  const tySub = interpolate(sSub, [0, 1], [12, 0]);

  return (
    <div
      style={{
        textAlign: align,
        fontFamily: FONT.display,
        color: COLORS.foreground,
        ...style,
      }}
    >
      {eyebrow && (
        <div
          style={{
            opacity,
            transform: `translateY(${ty}px)`,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: COLORS.primary,
            marginBottom: 16,
          }}
        >
          {eyebrow}
        </div>
      )}
      <div
        style={{
          opacity,
          transform: `translateY(${ty}px)`,
          fontSize: 64,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -1.2,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            opacity: opacitySub,
            transform: `translateY(${tySub}px)`,
            fontSize: 26,
            fontWeight: 400,
            color: COLORS.muted,
            marginTop: 18,
            maxWidth: 560,
            ...(align === "right" ? { marginLeft: "auto" } : {}),
            ...(align === "center" ? { marginLeft: "auto", marginRight: "auto" } : {}),
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
