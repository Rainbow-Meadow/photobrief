import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { GlassPanel } from "../components/GlassPanel";
import { Caption } from "../components/Caption";
import { COLORS, FONT, GRADIENT_PRIMARY, SPRING } from "../theme";

export const SceneSend: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelS = spring({ frame, fps, config: SPRING.smooth });
  const panelOp = interpolate(panelS, [0, 1], [0, 1]);
  const panelY = interpolate(panelS, [0, 1], [22, 0]);

  // Cursor moves toward the Send button (panel-wrapper relative coords).
  // Wrapper is 720px wide, panel is full width, button sits at the panel's
  // bottom-right (~x:600, y:540 inside the wrapper).
  const cursorX = interpolate(frame, [30, 90], [240, 590], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [30, 90], [220, 510], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Button "click" pulse + paper plane fly-off after frame 92
  const click = spring({ frame: frame - 92, fps, config: { damping: 14, stiffness: 220 } });
  const btnScale = interpolate(click, [0, 0.5, 1], [1, 0.92, 0.97]);
  const planeS = spring({ frame: frame - 96, fps, config: { damping: 18, stiffness: 90 } });
  const planeX = interpolate(planeS, [0, 1], [0, 900]);
  const planeY = interpolate(planeS, [0, 1], [0, -260]);
  const planeOpacity = interpolate(frame, [96, 102, 130], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 80, width: "100%", maxWidth: 1700 }}>
        {/* Left — request builder card */}
        <div style={{ position: "relative", width: 720 }}>
          <GlassPanel
            style={{
              opacity: panelOp,
              transform: `translateY(${panelY}px)`,
              padding: 36,
              fontFamily: FONT.body,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: COLORS.muted }}>
                New request
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.primary,
                  background: "rgba(33, 102, 244, 0.1)",
                  padding: "4px 12px",
                  borderRadius: 999,
                }}
              >
                AI draft
              </div>
            </div>

            <div style={{ marginTop: 22, fontSize: 36, fontWeight: 800, color: COLORS.foreground, letterSpacing: -0.6 }}>
              Garage Cleanout
            </div>
            <div style={{ marginTop: 8, fontSize: 18, color: COLORS.muted }}>
              Recipient: Marcus T. · 555-0142
            </div>

            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Wide shot of garage from open door",
                "Close-up of main pile (volume estimate)",
                "Oversize items + appliances",
                "+ 3 more shots",
              ].map((t, i) => {
                const stepS = spring({ frame: frame - (15 + i * 8), fps, config: SPRING.smooth });
                const op = interpolate(stepS, [0, 1], [0, 1]);
                const tx = interpolate(stepS, [0, 1], [-10, 0]);
                return (
                  <div
                    key={i}
                    style={{
                      opacity: op,
                      transform: `translateX(${tx}px)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 16px",
                      background: COLORS.mutedSurface,
                      borderRadius: 14,
                      fontSize: 17,
                      color: COLORS.foreground,
                      fontWeight: 500,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: i < 3 ? COLORS.primary : COLORS.muted,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}
                    </div>
                    {t}
                  </div>
                );
              })}
            </div>

            {/* Send button */}
            <div style={{ marginTop: 36, display: "flex", justifyContent: "flex-end" }}>
              <div
                style={{
                  transform: `scale(${btnScale})`,
                  background: GRADIENT_PRIMARY,
                  color: "white",
                  fontSize: 18,
                  fontWeight: 700,
                  padding: "16px 36px",
                  borderRadius: 999,
                  boxShadow: "0 12px 30px -10px rgba(33, 102, 244, 0.5)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                Send request
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M2 12l20-9-9 20-2-9-9-2z" fill="white" />
                </svg>
              </div>
            </div>
          </GlassPanel>

          {/* Cursor */}
          <div
            style={{
              position: "absolute",
              left: cursorX,
              top: cursorY,
              width: 28,
              height: 28,
              opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              pointerEvents: "none",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 2l7 18 2-8 8-2L3 2z" fill={COLORS.foreground} stroke="white" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Paper plane fly-off — emerges from the Send button area */}
          <div
            style={{
              position: "absolute",
              left: 580,
              top: 490,
              transform: `translate(${planeX}px, ${planeY}px) rotate(15deg)`,
              opacity: planeOpacity,
              pointerEvents: "none",
            }}
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <path d="M2 12l20-9-9 20-2-9-9-2z" fill={COLORS.primary} />
            </svg>
          </div>
        </div>

        {/* Right — caption */}
        <div style={{ flex: 1 }}>
          <Caption eyebrow="Step 01" title="Build a brief in seconds." subtitle="Pick a template or describe the job — your guide writes itself." delay={20} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
