import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDemoSupabase } from "./demoSupabase";

let client: SupabaseClient | null | undefined;

/**
 * The browser Supabase client, or null when accounts aren't configured
 * (no NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Every account
 * and chat feature checks this, so the checker works fully without it.
 * The anon key is public by design; row-level security protects the data.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url === "demo") {
    // Local demo: an in-browser stand-in, no network, nothing leaves the device.
    client = typeof window === "undefined" ? null : createDemoSupabase({ storageKey: "skinscript-demo" });
    return client;
  }
  client = url && key ? createClient(url, key, { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true } }) : null;
  return client;
}

/** For tests: inject a fake client. */
export function setSupabaseForTests(fake: SupabaseClient | null) {
  client = fake;
}

export const isDemoMode = () => process.env.NEXT_PUBLIC_SUPABASE_URL === "demo";

/**
 * Whether account features are switched on. Derived from the environment, not
 * from the client object, so the server render and the browser agree (the demo
 * client only exists in the browser).
 */
export const isAccountsConfigured = () =>
  isDemoMode() || Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
