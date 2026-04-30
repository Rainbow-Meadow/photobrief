import * as React from "react";
import { cn } from "@/lib/utils";

type GlassVariant = "card" | "nav" | "modal" | "widget" | "chat" | "hero";
type GlassTone = "light" | "dark" | "auto";
type GlassElevation = "flat" | "sm" | "md" | "lg";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  tone?: GlassTone;
  elevation?: GlassElevation;
  /** Adds hover lift + soft scale. */
  interactive?: boolean;
  asChild?: boolean;
}

const variantClass: Record<GlassVariant, string> = {
  card: "rounded-2xl glass",
  widget: "rounded-2xl glass",
  nav: "rounded-full glass-nav",
  modal: "rounded-3xl glass-strong",
  chat: "rounded-2xl glass",
  hero: "rounded-3xl glass-strong",
};

const elevationClass: Record<GlassElevation, string> = {
  flat: "",
  sm: "shadow-elev-sm",
  md: "shadow-glass",
  lg: "shadow-glass-lg",
};

/**
 * Apple-inspired glass surface primitive.
 * - Renders translucent + blurred + hairline border + inner sheen.
 * - Use on top of an ambient gradient/photo, never on flat white.
 */
export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  function GlassPanel(
    { className, variant = "card", tone = "auto", elevation = "md", interactive, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn(
          variantClass[variant],
          elevationClass[elevation],
          tone === "dark" && "glass-onDark",
          interactive && "lift-on-hover hover:shadow-glass-lg",
          className,
        )}
        {...rest}
      />
    );
  },
);
