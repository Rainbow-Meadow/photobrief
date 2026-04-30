import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, staticFile, Img } from "remotion";
import { Caption } from "../components/Caption";
import { COLORS, FONT, SPRING } from "../theme";

const PHOTOS = [
  { src: "photos/wide-garage.jpg", label: "Great wide shot" },
  { src: "photos/pile-closeup.jpg", label: "Volume looks like ~½ truck" },
  { src: "photos/mattress.jpg", label: "Oversize item flagged" },
  { src: "photos/appliances.jpg", label: "Mini-fridge — special handling" },
  { src: "photos/driveway-access.jpg", label: "Truck access confirmed" },
  { src: "photos/threshold.jpg", label: "Ground-level entry" },
];

const STAGGER = 28;
const TILE_DELAY_START = 18;

export const SceneCapture: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lastTileDelay = TILE_DELAY_START + (PHOTOS.length - 1) * STAGGER;
  const pillS = spring({ frame: frame - (lastTileDelay + 22), fps, config: SPRING.bouncy });
  const pillScale = interpolate(pillS, [0, 1], [0.6, 1]);
  const pillOp = interpolate(pillS, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 70, width: "100%", maxWidth: 1700 }}>
        {/* Caption left */}
        <div style={{ width: 480 }}>
          <Caption eyebrow="Step 03" title="AI guides every photo." subtitle="Quality-checked in real time — nothing missed, nothing blurry." delay={6} />

          {/* Counter pill */}
          <div
            style={{
              marginTop: 36,
              opacity: pillOp,
              transform: `scale(${pillScale})`,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(46, 168, 121, 0.12)",
              color: COLORS.success,
              padding: "10px 18px",
              borderRadius: 999,
              fontFamily: FONT.body,
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill={COLORS.success} />
              <path d="M7 12l3.5 3.5L17 9" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            6 of 6 captured
          </div>
        </div>

        {/* 3×2 grid */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 22,
          }}
        >
          {PHOTOS.map((p, i) => {
            const delay = TILE_DELAY_START + i * STAGGER;
            const s = spring({ frame: frame - delay, fps, config: SPRING.smooth });
            const op = interpolate(s, [0, 1], [0, 1]);
            const ty = interpolate(s, [0, 1], [22, 0]);
            const scale = interpolate(s, [0, 1], [0.95, 1]);

            const checkS = spring({ frame: frame - (delay + 12), fps, config: SPRING.bouncy });
            const checkScale = interpolate(checkS, [0, 1], [0, 1]);

            return (
              <div
                key={i}
                style={{
                  opacity: op,
                  transform: `translateY(${ty}px) scale(${scale})`,
                  borderRadius: 18,
                  overflow: "hidden",
                  position: "relative",
                  background: "white",
                  boxShadow: "0 16px 40px -16px rgba(20, 40, 80, 0.25)",
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div style={{ aspectRatio: "1 / 1", overflow: "hidden", position: "relative" }}>
                  <Img
                    src={staticFile(p.src)}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {/* check badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: COLORS.success,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: `scale(${checkScale})`,
                      boxShadow: "0 6px 16px -4px rgba(46,168,121,0.5)",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l4.5 4.5L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    fontFamily: FONT.body,
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.foreground,
                    background: "white",
                  }}
                >
                  {p.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
