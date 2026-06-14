import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client. Uses the SERVICE_ROLE_KEY, so it bypasses RLS —
// it must NEVER be importable from the client. The "server-only" guard enforces that.
// We use this purely to call the execute_readonly_query RPC defined in supabase/functions.sql.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
