import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./env";

// For Client Components: Dad's screen and live dashboard updates (Realtime).
// TODO: pass the generated Database type once `npm run db:types` has run against the live project.
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
