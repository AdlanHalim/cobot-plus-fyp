/**
 * @file supabase-server.js
 * @location cobot-plus-fyp/lib/supabase-server.js
 * 
 * @description
 * Server-side Supabase client factory using Service Role Key.
 * Provides elevated database access for API routes, bypassing Row Level Security (RLS).
 * 
 * @warning SECURITY: Never expose this client to the client-side.
 * The Service Role Key has full database access and bypasses all RLS policies.
 * 
 * @example
 * // In an API route (pages/api/example.js)
 * import { createServerSupabaseClient } from "@/lib/supabase-server";
 * const supabase = createServerSupabaseClient();
 * const { data } = await supabase.from("students").select("*");
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the Service Role Key for server-side operations.
 * 
 * @returns {import("@supabase/supabase-js").SupabaseClient} Supabase client instance
 * @throws {Error} If NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing
 * 
 * @description
 * IMPORTANT: This client bypasses Row Level Security (RLS).
 * Only use in:
 * - API routes (pages/api/*)
 * - getServerSideProps
 * - Server Actions
 * 
 * NEVER use in:
 * - Client components
 * - Browser JavaScript
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
