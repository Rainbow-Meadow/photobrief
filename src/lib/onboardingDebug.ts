const SENSITIVE_KEY = /(password|token|secret|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token)/i;

type DebugPayload = Record<string, unknown>;

function scrub(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY.test(key)) return "[redacted]";
  if (value == null || typeof value !== "object") return value;
  if (depth > 4) return "[truncated]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) return value.map((item) => scrub(item, key, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, scrub(v, k, depth + 1)]),
  );
}

export function onboardingDebug(event: string, payload: DebugPayload = {}) {
  console.info(
    "[onboarding-debug]",
    event,
    scrub({
      routeName: typeof window !== "undefined" ? window.location.pathname : "unknown",
      sessionPresent: payload.sessionPresent,
      ...payload,
    }),
  );
}

export function supabaseErrorDebug(error: unknown) {
  if (!error || typeof error !== "object") return error ?? null;
  const e = error as { name?: string; code?: string; status?: number; message?: string; details?: string; hint?: string };
  return scrub({
    name: e.name,
    code: e.code,
    status: e.status,
    message: e.message,
    details: e.details,
    hint: e.hint,
  });
}

export async function edgeFunctionErrorDebug(error: unknown) {
  const base = supabaseErrorDebug(error) as DebugPayload | null;
  const context = error && typeof error === "object" ? (error as { context?: Response }).context : undefined;
  if (!context) return base;

  let responseBody: unknown = null;
  try {
    const text = await context.clone().text();
    responseBody = text ? JSON.parse(text) : null;
  } catch {
    try {
      responseBody = await context.clone().text();
    } catch {
      responseBody = "[unavailable]";
    }
  }

  return scrub({
    ...base,
    httpStatus: context.status,
    responseBody,
  });
}