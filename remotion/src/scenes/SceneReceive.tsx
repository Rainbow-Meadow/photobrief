import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { PhoneFrame } from "../components/PhoneFrame";
import { Caption } from "../components/Caption";
import { COLORS, FONT, GRADIENT_PRIMARY, SPRING } from "../theme";

export const SceneReceive: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneS = spring({ frame, fps, config: SPRING.smooth });
  const phoneY = interpolate(phoneS, [0, 1], [120, 0]);
  const phoneOp = interpolate(phoneS, [0, 1], [0, 1]);

  // SMS bubble drops in around frame 20
  const smsS = spring({ frame: frame - 22, fps, config: SPRING.smooth });
  const smsOp = interpolate(smsS, [0, 1], [0, 1]);
  const smsScale = interpolate(smsS, [0, 1], [0.92, 1]);

  // Around frame 70 the SMS scales away and the chat content fades in
  const swap = interpolate(frame, [68, 84], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const smsExitOp = interpolate(swap, [0, 1], [1, 0]);
  const smsExitScale = interpolate(swap, [0, 1], [1, 0.85]);

  const chatS = spring({ frame: frame - 80, fps, config: SPRING.smooth });
  const chatOp = interpolate(chatS, [0, 1], [0, 1]);
  const chatY = interpolate(chatS, [0, 1], [12, 0]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 100, width: "100%", maxWidth: 1700 }}>
        {/* Caption left */}
        <div style={{ flex: 1 }}>
          <Caption eyebrow="Step 02" title="Customer just taps a link." subtitle="No app install. Works on any phone." delay={18} />
        </div>

        {/* Phone right */}
        <div
          style={{
            transform: `translateY(${phoneY}px)`,
            opacity: phoneOp,
          }}
        >
          <PhoneFrame width={400} height={800}>
            {/* SMS view */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: "70px 22px 22px",
                fontFamily: FONT.body,
                opacity: smsExitOp * smsOp,
                transform: `scale(${smsScale * smsExitScale})`,
                transformOrigin: "50% 30%",
              }}
            >
              <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, textAlign: "center", marginBottom: 16 }}>
                Messages · now
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.foreground, marginBottom: 8 }}>
                Apex Junk Removal
              </div>
              <div
                style={{
                  background: COLORS.mutedSurface,
                  padding: "14px 16px",
                  borderRadius: 18,
                  borderTopLeftRadius: 6,
                  fontSize: 15,
                  color: COLORS.foreground,
                  lineHeight: 1.4,
                  maxWidth: 300,
                }}
              >
                Hi Marcus — tap to send a few photos of the garage so we can quote your cleanout:{" "}
                <span style={{ color: COLORS.primary, fontWeight: 600 }}>photobrief.ai/r/4f8a</span>
              </div>
            </div>

            {/* Chat view (after swap) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                padding: "70px 0 0",
                fontFamily: FONT.body,
                opacity: chatOp,
                transform: `translateY(${chatY}px)`,
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "12px 22px 14px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: GRADIENT_PRIMARY,
                  }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.foreground }}>Apex Junk Removal</div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>Garage Cleanout</div>
                </div>
              </div>

              {/* Bubble */}
              <div style={{ padding: "20px 22px" }}>
                <div style={{ fontSize: 11, color: COLORS.primary, fontWeight: 700, marginBottom: 8 }}>
                  PHOTO 1 OF 6
                </div>
                <div
                  style={{
                    background: COLORS.mutedSurface,
                    padding: "14px 16px",
                    borderRadius: 18,
                    borderTopLeftRadius: 6,
                    maxWidth: 280,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.foreground, marginBottom: 4 }}>
                    Wide shot of the garage
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.4 }}>
                    Stand at the open door and capture the whole space.
                  </div>
                </div>
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
};
