import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, staticFile, Img } from "remotion";
import { GlassPanel } from "../components/GlassPanel";
import { ReadinessRing } from "../components/ReadinessRing";
import { Caption } from "../components/Caption";
import { COLORS, FONT, SPRING } from "../theme";

const PHOTOS = [
  "photos/wide-garage.jpg",
  "photos/pile-closeup.jpg",
  "photos/mattress.jpg",
  "photos/appliances.jpg",
  "photos/driveway-access.jpg",
  "photos/threshold.jpg",
];

const SUMMARY_LINES = [
  "Single-car garage cleanout, ~½ truckload.",
  "Mattress + box spring and mini-fridge flagged for oversize handling.",
  "Ground-level access, driveway fits a 16-ft truck — ready to dispatch.",
];

export const SceneBrief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelS = spring({ frame, fps, config: SPRING.smooth });
  const panelOp = interpolate(panelS, [0, 1], [0, 1]);
  const panelY = interpolate(panelS, [0, 1], [22, 0]);

  // gentle hero scale drift
  const drift = interpolate(frame, [0, 165], [1, 1.03]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 80, width: "100%", maxWidth: 1700 }}>
        {/* Caption left */}
        <div style={{ width: 460 }}>
          <Caption eyebrow="Step 04" title="A dispatch-ready brief." subtitle="Quote on the spot. No second visit, no chasing." delay={10} />
        </div>

        {/* Brief panel right */}
        <div style={{ flex: 1, transform: `scale(${drift})`, transformOrigin: "50% 50%" }}>
          <GlassPanel
            style={{
              opacity: panelOp,
              transform: `translateY(${panelY}px)`,
              padding: 36,
              fontFamily: FONT.body,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: COLORS.muted }}>
                  Submission · 2 min ago
                </div>
                <div style={{ marginTop: 8, fontSize: 32, fontWeight: 800, color: COLORS.foreground, letterSpacing: -0.6 }}>
                  Marcus T. — Garage Cleanout
                </div>
                <div style={{ marginTop: 4, fontSize: 16, color: COLORS.muted }}>6 of 6 photos · 0 retakes</div>
              </div>
              <ReadinessRing target={94} delay={14} size={140} />
            </div>

            {/* Photo strip */}
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {PHOTOS.map((p, i) => {
                const s = spring({ frame: frame - (10 + i * 4), fps, config: SPRING.smooth });
                const op = interpolate(s, [0, 1], [0, 1]);
                const sc = interpolate(s, [0, 1], [0.9, 1]);
                return (
                  <div
                    key={i}
                    style={{
                      opacity: op,
                      transform: `scale(${sc})`,
                      aspectRatio: "1 / 1",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <Img src={staticFile(p)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                );
              })}
            </div>

            {/* AI summary */}
            <div
              style={{
                marginTop: 24,
                padding: 22,
                background: "rgba(33, 102, 244, 0.06)",
                borderRadius: 16,
                border: `1px solid rgba(33, 102, 244, 0.15)`,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
                AI summary
              </div>
              {SUMMARY_LINES.map((line, i) => {
                const s = spring({ frame: frame - (40 + i * 18), fps, config: SPRING.smooth });
                const op = interpolate(s, [0, 1], [0, 1]);
                const ty = interpolate(s, [0, 1], [6, 0]);
                return (
                  <div
                    key={i}
                    style={{
                      opacity: op,
                      transform: `translateY(${ty}px)`,
                      fontSize: 17,
                      color: COLORS.foreground,
                      lineHeight: 1.5,
                      marginTop: i === 0 ? 0 : 6,
                    }}
                  >
                    {line}
                  </div>
                );
              })}
            </div>

            {/* Footer chip */}
            <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, color: COLORS.muted, fontWeight: 500 }}>
                Volume: ~½ truck · Oversize: mattress, mini-fridge
              </div>
              {(() => {
                const s = spring({ frame: frame - 110, fps, config: SPRING.bouncy });
                const op = interpolate(s, [0, 1], [0, 1]);
                const sc = interpolate(s, [0, 1], [0.85, 1]);
                return (
                  <div
                    style={{
                      opacity: op,
                      transform: `scale(${sc})`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: COLORS.success,
                      color: "white",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "8px 14px",
                      borderRadius: 999,
                    }}
                  >
                    ✓ First-pass guarantee active
                  </div>
                );
              })()}
            </div>
          </GlassPanel>
        </div>
      </div>
    </AbsoluteFill>
  );
};
