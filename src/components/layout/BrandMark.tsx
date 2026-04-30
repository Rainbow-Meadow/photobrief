import { cn } from "@/lib/utils";
import horizontalLogo from "@/assets/brand/photobrief-horizontal.webp";
import stackedLogo from "@/assets/brand/photobrief-stacked.png";
import wordmark from "@/assets/brand/photobrief-wordmark.webp";
import markDark from "@/assets/brand/photobrief-mark-dark.png";
import markLight from "@/assets/brand/photobrief-mark-light.png";
import primaryMark from "@/assets/brand/photobrief-primary.png";

export type BrandVariant = "horizontal" | "stacked" | "wordmark" | "mark" | "primary";
export type BrandTone = "auto" | "light" | "dark" | "color";

interface BrandMarkProps {
  className?: string;
  /** Which lockup to render. Defaults to "horizontal". */
  variant?: BrandVariant;
  /** Color treatment. "auto" swaps with the dark: class. */
  tone?: BrandTone;
  /** Visual height in px. Defaults to 28. */
  size?: number;
  /** Drop a soft brand glow behind the mark — for dark hero placements. */
  withGlow?: boolean;
  /** Eager-load above-the-fold logos for better LCP. */
  eager?: boolean;
  /** @deprecated Use `variant="mark"` instead. */
  markOnly?: boolean;
  /** @deprecated Use `tone="light"` instead. */
  invert?: boolean;
}

const ALT = "PhotoBrief";

function pickSrc(variant: BrandVariant, tone: BrandTone): string {
  if (variant === "primary") return primaryMark;
  if (variant === "horizontal") return horizontalLogo;
  if (variant === "stacked") return stackedLogo;
  if (variant === "wordmark") return wordmark;
  // variant === "mark"
  if (tone === "color") return primaryMark;
  if (tone === "light") return markLight;
  return markDark;
}

export function BrandMark({
  className,
  variant,
  tone = "auto",
  size = 28,
  withGlow = false,
  eager = false,
  markOnly,
  invert,
}: BrandMarkProps) {
  // Backwards-compat for old call sites
  const resolvedVariant: BrandVariant =
    variant ?? (markOnly ? "mark" : "horizontal");
  const resolvedTone: BrandTone = tone !== "auto" ? tone : invert ? "light" : "auto";

  const loading = eager ? "eager" : "lazy";
  const style = { height: size, width: "auto" as const };
  // Intrinsic aspect ratios for each variant (width:height) so we can emit
  // explicit width/height attributes — prevents CLS and satisfies the
  // Lighthouse "unsized-images" audit without changing displayed size.
  const aspectByVariant: Record<BrandVariant, number> = {
    horizontal: 378 / 126, // 3:1
    stacked: 1, // square-ish stacked lockup
    wordmark: 628 / 209, // ~3:1
    mark: 1,
    primary: 1,
  };
  const aspect = aspectByVariant[resolvedVariant];
  const intrinsicHeight = size;
  const intrinsicWidth = Math.round(size * aspect);
  const imgClass = cn(
    "block select-none",
    withGlow && "drop-shadow-[0_8px_28px_hsl(var(--primary)/0.45)]",
  );

  // For "auto" tone on a swappable variant (mark / horizontal / stacked / wordmark),
  // render two images and toggle them with the dark: class — no JS, no FOUC.
  if (resolvedTone === "auto") {
    const lightSrc = pickSrc(resolvedVariant, "dark"); // dark ink for light bg
    const darkSrc =
      resolvedVariant === "mark"
        ? markLight
        : pickSrc(resolvedVariant, "dark"); // wordmarks/lockups stay as-is in dark
    return (
      <span
        className={cn("inline-flex items-center", className)}
        aria-label={ALT}
      >
        <img
          src={lightSrc}
          alt={ALT}
          width={intrinsicWidth}
          height={intrinsicHeight}
          style={style}
          loading={loading}
          draggable={false}
          className={cn(imgClass, "dark:hidden")}
        />
        <img
          src={darkSrc}
          alt=""
          aria-hidden
          width={intrinsicWidth}
          height={intrinsicHeight}
          style={style}
          loading={loading}
          draggable={false}
          className={cn(imgClass, "hidden dark:block")}
        />
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center", className)}
      aria-label={ALT}
    >
      <img
        src={pickSrc(resolvedVariant, resolvedTone)}
        alt={ALT}
        width={intrinsicWidth}
        height={intrinsicHeight}
        style={style}
        loading={loading}
        draggable={false}
        className={imgClass}
      />
    </span>
  );
}
