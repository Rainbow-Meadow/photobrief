// Token-scoped Supabase client used by the public recipient flow.
//
// The recipient page has no auth session. RLS policies on requests,
// submissions, captured_media etc. read the `x-request-token` header via
// the `request_id_for_token()` SQL function, so every request from the
// recipient page must include this header. Each token gets its own
// client instance to keep the header isolated.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const cache = new Map<string, SupabaseClient<Database>>();

export function getTokenClient(token: string): SupabaseClient<Database> {
  const existing = cache.get(token);
  if (existing) return existing;

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { "x-request-token": token },
    },
  });
  cache.set(token, client);
  return client;
}
