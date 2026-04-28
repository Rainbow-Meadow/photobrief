// Mock AI vision check — Phase 2 only. Replaced by edge function in Phase 5.
// Deterministic-ish randomness so the demo varies but is rerunnable.
import { aiChecks } from "@/config/aiChecks";
import type { GuideStep, AICheckSeverity } from "@/types/photobrief";
import type { AICheckResultMock } from "@/types/chat";

function pickSeverity(): AICheckSeverity {
  const r = Math.random();
  if (r < 0.65) return "pass";
  if (r < 0.9) return "warn";
  return "fail";
}

/** Aggregate severity = worst of any check. */
export function worstSeverity(results: AICheckResultMock[]): AICheckSeverity {
  if (results.some((r) => r.severity === "fail")) return "fail";
  if (results.some((r) => r.severity === "warn")) return "warn";
  return "pass";
}

/** Simulate AI checks for a captured photo on a given step. */
export async function simulatePhotoChecks(step: GuideStep): Promise<AICheckResultMock[]> {
  // Simulate latency
  await new Promise((res) => setTimeout(res, 900));

  return step.aiChecks.map((checkId) => {
    const def = aiChecks[checkId];
    // "detected" checks (label_detected, etc.) are positive signals — usually pass.
    const isDetector = def.defaultSeverity === "pass";
    const severity: AICheckSeverity = isDetector
      ? Math.random() < 0.85
        ? "pass"
        : "warn"
      : pickSeverity();
    const message =
      severity === "pass"
        ? def.passMessage ?? `${def.label} ✓`
        : def.failMessage;
    return { id: checkId, severity, message };
  });
}
