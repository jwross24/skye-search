import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

let _client: SupabaseClient | null = null

/** Shared service-role Supabase client for Edge Functions. Bypasses RLS. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  }
  return _client
}
