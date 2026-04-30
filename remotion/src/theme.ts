// Color tokens lifted from src/index.css. HSL → CSS strings.
// Light theme is the marketing site default.
export const COLORS = {
  bg: "hsl(220, 25%, 97%)",
  bgWarm: "hsl(35, 40%, 96%)",
  foreground: "hsl(220, 25%, 12%)",
  muted: "hsl(220, 14%, 46%)",
  mutedSurface: "hsl(220, 16%, 94%)",
  border: "hsl(220, 16%, 88%)",
  primary: "hsl(217, 91%, 55%)",
  primaryGlow: "hsl(199, 95%, 64%)",
  primaryFg: "hsl(0, 0%, 100%)",
  success: "hsl(152, 60%, 42%)",
  glassBg: "rgba(255, 255, 255, 0.78)",
  glassBorder: "rgba(255, 255, 255, 0.6)",
  glassShadow: "0 24px 60px -20px rgba(20, 40, 80, 0.25), 0 4px 16px -4px rgba(20, 40, 80, 0.12)",
  ringTrack: "hsl(220, 16%, 88%)",
};

export const GRADIENT_PRIMARY = `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`;

export const SPRING = {
  // Default smooth entrance
  smooth: { damping: 20, stiffness: 180, mass: 1 },
  // Hero / accent moments
  bouncy: { damping: 12, stiffness: 160, mass: 1 },
  // Snappy
  snap: { damping: 22, stiffness: 240, mass: 1 },
};

export const FONT = {
  display: "Inter, system-ui, sans-serif",
  body: "Inter, system-ui, sans-serif",
};
