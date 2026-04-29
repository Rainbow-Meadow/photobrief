import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type Pin = {
  /** Percent x position, 0-100 */
  x: number;
  /** Percent y position, 0-100 */
  y: number;
  label: string | number;
  note?: string;
};

/**
 * AnnotatedScreenshot — wraps an image with numbered pins.
 * If the source image fails to load (e.g. placeholder asset not yet shipped),
 * we render a labelled placeholder card instead so the guide is shippable.
 */
export function AnnotatedScreenshot({
  src,
  alt,
  caption,
  pins = [],
  ratio = "16/10",
  className,
}: {
  src?: string;
  alt: string;
  caption?: string;
  pins?: Pin[];
  ratio?: "16/10" | "16/9" | "4/3" | "9/16" | "3/4";
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;

  return (
    <figure className={cn("space-y-2", className)}>
      <div
        className="relative w-full overflow-hidden rounded-xl border bg-muted/40"
        style={{ aspectRatio: ratio.replace("/", " / ") }}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setErrored(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
            <ImageOff className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-xs font-medium text-muted-foreground">Screenshot coming soon</p>
            <p className="max-w-xs text-[11px] leading-relaxed text-muted-foreground/80">{alt}</p>
          </div>
        )}

        {/* Pins overlay — render even on placeholder so reviewers see anchor positions */}
        {pins.map((p, i) => (
          <div
            key={i}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-[11px] font-bold text-primary-foreground shadow-md"
              aria-label={`Callout ${p.label}${p.note ? `: ${p.note}` : ""}`}
            >
              {p.label}
            </span>
          </div>
        ))}
      </div>

      {(caption || pins.some((p) => p.note)) && (
        <figcaption className="space-y-1 text-xs text-muted-foreground">
          {caption && <p>{caption}</p>}
          {pins.some((p) => p.note) && (
            <ol className="space-y-0.5">
              {pins
                .filter((p) => p.note)
                .map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-semibold text-foreground">{p.label}.</span>
                    <span>{p.note}</span>
                  </li>
                ))}
            </ol>
          )}
        </figcaption>
      )}
    </figure>
  );
}
