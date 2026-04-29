// Shared transient-error retry for PostgREST/Supabase calls.
//
// Lovable Cloud occasionally returns 503 / `PGRST002` ("Could not query the
// database for the schema cache. Retrying.") for a few seconds during
// instance restarts, restores, and resizes. Without retrying, every
// signed-in flow that depends on a fresh table read (workspace lookup,
// onboarding writes, etc.) fails silently.

type SupaError =
  | { code?: string; message?: string; details?: string; hint?: string; status?: number }
  | null
  | undefined;
type SupaResult<T> = { data: T | null; error: SupaError };

const TRANSIENT_CODES = new Set(["PGRST001", "PGRST002", "503", "57P03", "08000", "08001", "08006"]);

function normalizeThrownError(err: unknown): Exclude<SupaError, null | undefined> {
  if (err && typeof err === "object") return err as Exclude<SupaError, null | undefined>;
  return { message: typeof err === "string" ? err : "Network request failed" };
}

export function isTransientSupabaseError(error: SupaError): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = error.message ?? "";
  return (
    error.status === 503 ||
    TRANSIENT_CODES.has(code) ||
    msg.includes("schema cache") ||
    msg.includes("Database client error") ||
    msg.includes("503") ||
    msg.includes("Connection terminated") ||
    msg.includes("Failed to fetch") ||
    msg.includes("fetch failed") ||
    msg.includes("secure TLS") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("timeout")
  );
}

// Reduced from 7 → 2 attempts. Heavy retry loops were amplifying backend load
// during 503 windows; we'd rather surface the failure once and let the UI show
// a clear "backend unavailable" state instead of hammering PostgREST.
export async function withSupabaseRetry<T>(
  fn: () => Promise<SupaResult<T>>,
  maxAttempts = 2,
): Promise<SupaResult<T>> {
  let last: SupaResult<T> = { data: null, error: null };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      last = await fn();
    } catch (err) {
      last = { data: null, error: normalizeThrownError(err) };
    }
    if (!last.error || !isTransientSupabaseError(last.error)) return last;
    if (attempt === maxAttempts - 1) break;
    const delay = Math.min(4000, 300 * Math.pow(2, attempt)) + Math.floor(Math.random() * 150);
    await new Promise((r) => setTimeout(r, delay));
  }
  return last;
}
