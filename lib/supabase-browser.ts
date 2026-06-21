import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Module-level singleton — prevents "Multiple GoTrueClient instances" warning
// that fires when components each call createClient() independently.
let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return client;
}
