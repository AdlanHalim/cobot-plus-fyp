// lib/supabase-server.js
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the Service Role Key for server-side operations.
 * CRITICAL: Only use this in API routes, never expose to client-side.
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
export function createServerSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error(
            "Missing Supabase environment variables. " +
            "Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
        );
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
