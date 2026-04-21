import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS, never expose to the browser.
 * Used only in server-side API routes that need admin auth operations
 * (e.g. deleting a Supabase auth user on account deletion).
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
