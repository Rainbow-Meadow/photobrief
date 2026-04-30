import React from "react";
import { COLORS } from "../theme";

export const GlassPanel: React.FC<
  React.PropsWithChildren<{ style?: React.CSSProperties; radius?: number }>
> = ({ children, style, radius = 28 }) => {
  return (
    <div
      style={{
        background: COLORS.glassBg,
        border: `1px solid ${COLORS.glassBorder}`,
        borderRadius: radius,
        boxShadow: COLORS.glassShadow,
        backdropFilter: undefined, // intentionally avoided
        ...style,
      }}
    >
      {children}
    </div>
  );
};
