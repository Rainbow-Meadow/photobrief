import { cn } from "@/lib/utils";
import wordmark from "@/assets/photobrief-logo.png";
import mark from "@/assets/photobrief-mark.png";

interface BrandMarkProps {
  className?: string;
  /** Render only the camera mark (no wordmark). Useful for compact headers. */
  markOnly?: boolean;
  /** Visual height in px. Defaults to 28. */
  size?: number;
  /** Force a light variant by inverting the wordmark for dark backgrounds. */
  invert?: boolean;
}

export function BrandMark({
  className,
  markOnly = false,
  size = 28,
  invert = false,
}: BrandMarkProps) {
  const src = markOnly ? mark : wordmark;
  return (
    <span
      className={cn("inline-flex items-center", className)}
      aria-label="PhotoBrief"
    >
      <img
        src={src}
        alt="PhotoBrief"
        style={{ height: size, width: "auto" }}
        className={cn(
          "block select-none",
          invert && "brightness-0 invert",
        )}
        draggable={false}
      />
    </span>
  );
}
