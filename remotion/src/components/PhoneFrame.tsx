import React from "react";
import { COLORS } from "../theme";

interface Props {
  width?: number;
  height?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const PhoneFrame: React.FC<Props> = ({
  width = 380,
  height = 760,
  children,
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 52,
        background: "#0d1117",
        padding: 10,
        boxShadow:
          "0 40px 80px -30px rgba(20, 40, 80, 0.45), 0 8px 24px -8px rgba(20, 40, 80, 0.2)",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 44,
          background: COLORS.bg,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* notch */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 110,
            height: 28,
            borderRadius: 14,
            background: "#0d1117",
            zIndex: 10,
          }}
        />
        {children}
      </div>
    </div>
  );
};
