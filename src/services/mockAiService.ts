// Deprecated: kept as a thin shim over aiService for backwards compatibility.
// New code should import from "@/services/aiService" directly.
import { aiService } from "@/services/aiService";
import type { AICheckSeverity, GuideStep } from "@/types/photobrief";
import type { AICheckResultMock } from "@/types/chat";

export function worstSeverity(results: AICheckResultMock[]): AICheckSeverity {
  if (results.some((r) => r.severity === "fail")) return "fail";
  if (results.some((r) => r.severity === "warn")) return "warn";
  return "pass";
}

export async function simulatePhotoChecks(step: GuideStep): Promise<AICheckResultMock[]> {
  const { checks } = await aiService.analyzeCapturedMedia({ step });
  return checks.map((c) => ({ id: c.type, severity: c.severity, message: c.message }));
}
