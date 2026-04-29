// Mobile-first card grid for buying request top-up credit packs.
// On mobile: vertical stack. On sm+: 3-column grid.
import { Check, Sparkles, Zap, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { topupPacks, formatPrice, perRequestCents, type TopupPack } from "@/config/topupPacks";
import { cn } from "@/lib/utils";

interface Props {
  onSelect: (pack: TopupPack) => void;
  pendingPriceId?: TopupPack["priceId"] | null;
  /** Disable purchase (e.g. payments not configured or free plan). */
  disabled?: boolean;
  disabledReason?: string;
}

const ICONS: Record<TopupPack["priceId"], typeof Sparkles> = {
  topup_25: Zap,
  topup_100: Sparkles,
  topup_500: Package,
};

export function TopupPackCards({ onSelect, pendingPriceId, disabled, disabledReason }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {topupPacks.map((pack) => {
        const Icon = ICONS[pack.priceId];
        const isPending = pendingPriceId === pack.priceId;
        return (
          <article
            key={pack.priceId}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card p-5 shadow-elev-sm transition",
              pack.highlight && "border-primary/40 ring-1 ring-primary/20",
            )}
          >
            {pack.highlight ? (
              <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
                Most popular
              </span>
            ) : null}
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <h4 className="text-base font-semibold text-foreground">{pack.label}</h4>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{pack.tagline}</p>

            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {formatPrice(pack.amountCents, pack.currency)}
              </span>
              <span className="text-sm text-muted-foreground">one-time</span>
            </div>

            <ul className="mt-4 space-y-1.5 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span className="text-foreground">
                  <span className="font-medium">+{pack.size}</span> requests
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span className="text-muted-foreground">
                  ~{(perRequestCents(pack) / 100).toFixed(2)} per request
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span className="text-muted-foreground">
                  Valid through end of current billing period
                </span>
              </li>
            </ul>

            <Button
              className="mt-5 w-full"
              variant={pack.highlight ? "default" : "outline"}
              onClick={() => onSelect(pack)}
              disabled={disabled || isPending}
            >
              {isPending ? "Opening checkout…" : `Buy ${pack.size}-pack`}
            </Button>
            {disabled && disabledReason ? (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">{disabledReason}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
