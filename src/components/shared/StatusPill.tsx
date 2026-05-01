import { cn } from "@/lib/utils";

export type StatusPillTone = "pass" | "warn" | "fail" | "info" | "muted";

interface Props {
  label: string;
  tone?: StatusPillTone;
  className?: string;
}

const toneClass: Record<StatusPillTone, string> = {
  pass: "pill-pass",
  warn: "pill-warn",
  fail: "pill-fail",
  info: "pill-info",
  muted: "pill-muted",
};

/**
 * Compact status pill matching the in-product mockups.
 * Reads from the `--app-pill-*` tokens so it stays consistent
 * across light/dark modes and inside the `.app-shell` scope.
 */
export function StatusPill({ label, tone = "muted", className }: Props) {
  return <span className={cn("pill", toneClass[tone], className)}>{label}</span>;
}
