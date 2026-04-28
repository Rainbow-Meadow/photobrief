import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";

interface BrandMarkProps {
  className?: string;
  showWordmark?: boolean;
}

export function BrandMark({ className, showWordmark = true }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground shadow-glow">
        <Camera className="h-4 w-4" />
      </span>
      {showWordmark ? (
        <span className="text-base font-semibold tracking-tight text-foreground">PhotoBrief</span>
      ) : null}
    </div>
  );
}
