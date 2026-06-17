import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client.
 *
 * ⚠️ SECURITY: This client bypasses Row Level Security and can read/write any
 * row, including auth.users. It MUST only ever be imported by Server Actions
 * ('use server' files) or other server-only code. Never import this from a
 * Client Component — the service role key would be exposed to the browser.
 *
 * The service role key is read from a server-only env var (SUPABASE_SERVICE_ROLE_KEY),
 * which is intentionally NOT prefixed with NEXT_PUBLIC_ so Next.js keeps it out of
 * the client bundle.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    }
    if (!serviceRoleKey) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (and Vercel env) — it is required for admin operations such as password reset.'
        );
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            // Service-role client has no user session to persist.
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
