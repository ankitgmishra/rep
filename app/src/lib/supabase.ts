import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client placeholder for Step 1
 * Uses environment variables if configured, with graceful fallback.
 * Full auth lifecycle and schema integration will be wired in Step 2.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-cadra.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
  },
});

