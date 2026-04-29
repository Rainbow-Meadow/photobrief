// Shared transient-error retry for PostgREST/Supabase calls.
//
// Lovable Cloud occasionally returns 503 / `PGRST002` ("Could not query the
// database for the schema cache. Retrying.") for a few seconds during
// instance restarts, restores, and resizes. Without retrying, every
// signed-in flow that depends on a fresh table read (workspace lookup,
// onboarding writes, etc.) fails silently.

type SupaError = { code?: string; message?: string } | null | undefined;
type SupaResult<T> = { data: T | null; error: SupaError };

const TRANSIENT_CODES = new Set(["PGRST001", "PGRST002", "503"]);

export function isTransientSupabaseError(error: SupaError): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = error.message ?? "";
  return (
    TRANSIENT_CODES.has(code) ||
    msg.includes("schema cache") ||
    msg.includes("Database client error") ||
    msg.includes("503")
  );
}

export async function withSupabaseRetry<T>(
  fn: () => Promise<SupaResult<T>>,
  maxAttempts = 4,
): Promise<SupaResult<T>> {
  let last: SupaResult<T> = { data: null, error: null };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = await fn();
    if (!last.error || !isTransientSupabaseError(last.error)) return last;
    // 250ms, 750ms, 2.25s
    await new Promise((r) => setTimeout(r, 250 * Math.pow(3, attempt)));
  }
  return last;
}
